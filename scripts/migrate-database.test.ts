import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { BASELINE_MIGRATION, migrateDatabase, runPrisma, shouldMigrateOnStart } from './migrate-database.mjs'

type Result = { code: number; output: string }

function fakePrisma(responses: Record<string, Result[]>) {
    const calls: string[] = []
    const run = async (args: string[]) => {
        const key = args.slice(0, 2).join(' ')
        calls.push(args.join(' '))
        const next = responses[key]?.shift()
        assert.ok(next, `unexpected prisma call: ${args.join(' ')}`)
        return next
    }
    return { run, calls }
}

const ok = { code: 0, output: '' }
const silent = () => {}

test('shouldMigrateOnStart defaults to enabled and accepts false-like opt-outs', () => {
    assert.equal(shouldMigrateOnStart(undefined), true)
    assert.equal(shouldMigrateOnStart('true'), true)
    assert.equal(shouldMigrateOnStart('false'), false)
    assert.equal(shouldMigrateOnStart(' NO '), false)
    assert.equal(shouldMigrateOnStart('0'), false)
})

test('a migrated database is deployed and checked without baselining', async () => {
    const prisma = fakePrisma({ 'migrate deploy': [ok], 'migrate diff': [ok] })
    assert.deepEqual(await migrateDatabase({ run: prisma.run, log: silent }), { baselined: false, drift: false })
    assert.deepEqual(prisma.calls, [
        'migrate deploy',
        'migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code',
    ])
})

test('a db-push database (P3005) is baselined once, then deployed', async () => {
    const prisma = fakePrisma({
        'migrate deploy': [{ code: 1, output: 'Error: P3005\nThe database schema is not empty.' }, ok],
        'migrate resolve': [ok],
        'migrate diff': [ok],
    })
    assert.deepEqual(await migrateDatabase({ run: prisma.run, log: silent }), { baselined: true, drift: false })
    assert.deepEqual(prisma.calls.slice(0, 3), [
        'migrate deploy',
        `migrate resolve --applied ${BASELINE_MIGRATION}`,
        'migrate deploy',
    ])
})

test('any other deploy failure throws without touching migration history', async () => {
    const prisma = fakePrisma({ 'migrate deploy': [{ code: 1, output: 'Error: P1001 Cannot reach database' }] })
    await assert.rejects(migrateDatabase({ run: prisma.run, log: silent }), /migrate deploy failed/)
    assert.deepEqual(prisma.calls, ['migrate deploy'])
})

test('a failed baseline or a failed deploy after baselining throws', async () => {
    const p3005 = { code: 1, output: 'Error: P3005' }
    const resolveFails = fakePrisma({ 'migrate deploy': [p3005], 'migrate resolve': [{ code: 1, output: '' }] })
    await assert.rejects(migrateDatabase({ run: resolveFails.run, log: silent }), /migrate resolve failed/)

    const deployFails = fakePrisma({
        'migrate deploy': [p3005, { code: 1, output: 'column already exists' }],
        'migrate resolve': [ok],
    })
    await assert.rejects(migrateDatabase({ run: deployFails.run, log: silent }), /migrate deploy failed/)
})

test('drift after migrating is reported, not fatal', async () => {
    const logs: string[] = []
    const prisma = fakePrisma({ 'migrate deploy': [ok], 'migrate diff': [{ code: 2, output: '[+] Added column' }] })
    const result = await migrateDatabase({ run: prisma.run, log: (message) => logs.push(message) })
    assert.deepEqual(result, { baselined: false, drift: true })
    assert.match(logs.join('\n'), /WARNING/)
})

test('the baseline migration is the schema production had before migrations', () => {
    const sql = readFileSync(join(import.meta.dirname, '..', 'prisma', 'migrations', BASELINE_MIGRATION, 'migration.sql'), 'utf8')
    assert.match(sql, /CREATE TABLE "Bot"/)
    assert.doesNotMatch(sql, /ManagedCloneAttempt|telegramId/)
})

// Real Postgres checks. TEST_DATABASE_URL is wiped on every run, e.g. with the
// local Compose stack: TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/tgbot_test
const testDatabaseUrl = process.env.TEST_DATABASE_URL
const skip = !testDatabaseUrl
    ? 'TEST_DATABASE_URL not set'
    : testDatabaseUrl === process.env.DATABASE_URL
      ? 'TEST_DATABASE_URL must not be DATABASE_URL: it is wiped'
      : false

const root = join(import.meta.dirname, '..')
const cli = join(root, 'node_modules', 'prisma', 'build', 'index.js')
const execute = (sql: string) =>
    execFileSync(process.execPath, [cli, 'db', 'execute', '--stdin'], {
        cwd: root,
        input: sql,
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    })

test('migrations reproduce prisma/schema.prisma exactly', { skip }, async () => {
    // Prisma diffs a migrations directory by replaying it into a shadow database,
    // which must differ from the main one. Without a main DATABASE_URL, Prisma 7
    // skips the diff and still exits 0, so the empty-migration text is asserted.
    const shadowUrl = new URL(testDatabaseUrl!)
    shadowUrl.pathname += '_shadow'
    process.env.DATABASE_URL = testDatabaseUrl
    try {
        execute(`CREATE DATABASE "${shadowUrl.pathname.slice(1)}"`)
    } catch {
        // already exists
    }

    process.env.SHADOW_DATABASE_URL = shadowUrl.toString()
    const diff = await runPrisma(
        root,
        ['migrate', 'diff', '--from-migrations', 'prisma/migrations', '--to-schema', 'prisma/schema.prisma', '--script'],
        { echo: false },
    ).finally(() => delete process.env.SHADOW_DATABASE_URL)

    assert.equal(diff.code, 0, diff.output)
    assert.match(
        diff.output,
        /This is an empty migration/,
        `prisma/schema.prisma has changes with no migration; create one with pnpm prisma-migrate:\n${diff.output}`,
    )
})

test('a populated db-push database is baselined and migrated without losing rows', { skip }, async () => {
    const reset = 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;'

    // Recreate production as it is today: the baseline schema, created by db push
    // (no _prisma_migrations), holding a manual clone.
    execute(reset)
    execute(readFileSync(join(root, 'prisma', 'migrations', BASELINE_MIGRATION, 'migration.sql'), 'utf8'))
    execute(`INSERT INTO "Bot" (id, token, owner) VALUES ('legacy', '111:legacy-token', '42');`)

    process.env.DATABASE_URL = testDatabaseUrl
    const run = (args: string[]) => runPrisma(root, args, { echo: false })
    assert.deepEqual(await migrateDatabase({ run, log: silent }), { baselined: true, drift: false })
    // Second start: nothing pending, no second baseline.
    assert.deepEqual(await migrateDatabase({ run, log: silent }), { baselined: false, drift: false })

    const { prisma } = await import('../db/prisma')
    try {
        const bots = await prisma.bot.findMany()
        assert.equal(bots.length, 1)
        assert.equal(bots[0].token, '111:legacy-token')
        assert.equal(bots[0].connected, false)
        assert.equal(await prisma.managedCloneAttempt.count(), 0)
    } finally {
        await prisma.$disconnect()
    }
})
