import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// The first migration is the schema production had before Prisma Migrate was
// adopted. That database was created with `prisma db push`, so it has tables but
// no _prisma_migrations history, and `migrate deploy` refuses it with P3005.
export const BASELINE_MIGRATION = '0_init'

// Directory holding prisma.config.ts, prisma/ and a node_modules with the prisma
// CLI. In the Docker image that is /app/migrate (see Dockerfile); locally it is
// the repository root.
export function getMigrateDir(env = process.env) {
    return env.PRISMA_MIGRATE_DIR || join(import.meta.dirname, '..', 'migrate')
}

/**
 * @param {string | undefined} value
 */
export function shouldMigrateOnStart(value) {
    const normalized = String(value ?? '').trim().toLowerCase()
    return !['0', 'false', 'no'].includes(normalized)
}

/**
 * Run the prisma CLI, echoing its output and resolving with it.
 *
 * @param {string} cwd
 * @param {string[]} args
 * @param {{ echo?: boolean }} [options]
 * @returns {Promise<{ code: number, output: string }>}
 */
export function runPrisma(cwd, args, { echo = true } = {}) {
    const cli = join(cwd, 'node_modules', 'prisma', 'build', 'index.js')
    return new Promise((resolve, reject) => {
        // No update banner or telemetry call on every container start
        const env = { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: '1', CHECKPOINT_DISABLE: '1' }
        const child = spawn(process.execPath, [cli, ...args], { cwd, env })
        let output = ''
        for (const [stream, sink] of [
            [child.stdout, process.stdout],
            [child.stderr, process.stderr],
        ]) {
            stream.on('data', (chunk) => {
                output += chunk
                if (echo) sink.write(chunk)
            })
        }
        child.once('error', reject)
        child.once('close', (code) => resolve({ code: code ?? 1, output }))
    })
}

/**
 * Apply pending migrations. A database created by `prisma db push` before
 * migrations existed is baselined at BASELINE_MIGRATION once, then migrated.
 * Afterwards the live schema is compared with schema.prisma and any drift is
 * logged, so a database that did not match the baseline is visible.
 *
 * @param {{ run: (args: string[]) => Promise<{ code: number, output: string }>, log?: (message: string) => void }} options
 * @returns {Promise<{ baselined: boolean, drift: boolean }>}
 */
export async function migrateDatabase({ run, log = console.log }) {
    let baselined = false
    let deploy = await run(['migrate', 'deploy'])

    if (deploy.code !== 0 && /\bP3005\b/.test(deploy.output)) {
        log(`[migrate] Existing database has no migration history; marking ${BASELINE_MIGRATION} as applied`)
        const resolve = await run(['migrate', 'resolve', '--applied', BASELINE_MIGRATION])
        if (resolve.code !== 0) {
            throw new Error(`prisma migrate resolve failed with exit code ${resolve.code}`)
        }
        baselined = true
        deploy = await run(['migrate', 'deploy'])
    }

    if (deploy.code !== 0) {
        throw new Error(`prisma migrate deploy failed with exit code ${deploy.code}`)
    }

    // --exit-code: 0 = no difference, 2 = difference, anything else = error.
    const check = await run([
        'migrate',
        'diff',
        '--from-config-datasource',
        '--to-schema',
        'prisma/schema.prisma',
        '--exit-code',
    ])
    const drift = check.code !== 0
    if (drift) {
        log('[migrate] WARNING: the database does not match prisma/schema.prisma after migrating (see diff above)')
    } else {
        log('[migrate] Database schema is up to date')
    }

    return { baselined, drift }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const cwd = getMigrateDir()
    migrateDatabase({ run: (args) => runPrisma(cwd, args) }).catch((error) => {
        console.error('[migrate] Failed to migrate the database')
        console.error(error)
        process.exit(1)
    })
}
