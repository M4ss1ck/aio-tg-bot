import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

// Production already holds Bot rows, and the schema is applied with `prisma db push`.
// Postgres cannot add a required column without a default to a non-empty table, so
// every Bot column added after the original three must be optional or defaulted.
const ORIGINAL_BOT_FIELDS = new Set(['id', 'token', 'owner'])

function modelFields(schema: string, model: string) {
    const body = schema.match(new RegExp(`model ${model} \\{([^}]*)\\}`))?.[1]
    assert.ok(body, `model ${model} not found in schema.prisma`)
    return body
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('//') && !line.startsWith('@@'))
        .map((line) => {
            const [name, type, ...attributes] = line.split(/\s+/)
            return { name, type, attributes: attributes.join(' ') }
        })
}

test('columns added to Bot can be pushed onto a table that already has rows', () => {
    const schema = readFileSync(new URL('./schema.prisma', import.meta.url), 'utf8')
    const added = modelFields(schema, 'Bot').filter((field) => !ORIGINAL_BOT_FIELDS.has(field.name))

    assert.ok(added.length > 0)
    for (const field of added) {
        assert.ok(
            field.type.endsWith('?') || field.attributes.includes('@default('),
            `Bot.${field.name} is required with no @default; prisma db push fails on a non-empty Bot table`,
        )
    }
})
