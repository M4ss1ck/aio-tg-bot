import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createClonesPOST, type CloneRouteRecord } from '../handler'

const RECORD: CloneRouteRecord = {
    token: '111222333:managed-clone-token-value',
    webhookSecret: 'per-clone-secret',
    quarantined: false,
    connected: true,
}

function setup(records: Record<string, CloneRouteRecord | undefined> = { 'bot-internal-1': RECORD }) {
    const dispatched: Array<{ bot: unknown; secret: string }> = []
    const createdTokens: string[] = []
    const POST = createClonesPOST({
        findCloneRecord: async (id) => records[id] ?? null,
        createCloneBot: async (token) => {
            createdTokens.push(token)
            return { marker: 'clone-bot' }
        },
        dispatchUpdate: async (bot, _request, secret) => {
            dispatched.push({ bot, secret })
            return Response.json({ handled: true }, { status: 200 })
        },
    })
    return { POST, dispatched, createdTokens }
}

function cloneRequest(id: string, secret?: string): Request {
    const headers = new Headers({ 'content-type': 'application/json' })
    if (secret !== undefined) {
        headers.set('X-Telegram-Bot-Api-Secret-Token', secret)
    }
    return new Request(`https://bot.example.test/api/clones/${id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ update_id: 1, message: { message_id: 1, date: 1, text: 'hi' } }),
    })
}

async function readBody(response: Response): Promise<string> {
    return await response.text()
}

test('clone webhook rejects unknown bot ids without creating a bot', async () => {
    const { POST, dispatched, createdTokens } = setup({})

    const response = await POST(cloneRequest('bot-internal-9', 'per-clone-secret'), {
        params: Promise.resolve({ id: 'bot-internal-9' }),
    })

    assert.equal(response.status, 200)
    assert.equal(await readBody(response), '{}')
    assert.deepEqual(dispatched, [])
    assert.deepEqual(createdTokens, [])
})

test('clone webhook rejects quarantined clones', async () => {
    const { POST, dispatched } = setup({
        'bot-internal-1': { ...RECORD, quarantined: true },
    })

    const response = await POST(cloneRequest('bot-internal-1', 'per-clone-secret'), {
        params: Promise.resolve({ id: 'bot-internal-1' }),
    })

    assert.equal(response.status, 200)
    assert.equal(await readBody(response), '{}')
    assert.deepEqual(dispatched, [])
})

test('clone webhook rejects records that are not connected yet', async () => {
    const { POST, dispatched, createdTokens } = setup({
        'bot-internal-1': { ...RECORD, connected: false },
    })

    const response = await POST(cloneRequest('bot-internal-1', 'per-clone-secret'), {
        params: Promise.resolve({ id: 'bot-internal-1' }),
    })

    assert.equal(response.status, 200)
    assert.equal(await readBody(response), '{}')
    assert.deepEqual(dispatched, [])
    assert.deepEqual(createdTokens, [])
})

test('clone webhook rejects records without a token', async () => {
    const { POST, dispatched } = setup({
        'bot-internal-1': { ...RECORD, token: null },
    })

    const response = await POST(cloneRequest('bot-internal-1', 'per-clone-secret'), {
        params: Promise.resolve({ id: 'bot-internal-1' }),
    })

    assert.equal(response.status, 200)
    assert.deepEqual(dispatched, [])
})

test('clone webhook rejects records without a webhook secret', async () => {
    const { POST, dispatched } = setup({
        'bot-internal-1': { ...RECORD, webhookSecret: null },
    })

    const response = await POST(cloneRequest('bot-internal-1', 'per-clone-secret'), {
        params: Promise.resolve({ id: 'bot-internal-1' }),
    })

    assert.equal(response.status, 200)
    assert.deepEqual(dispatched, [])
})

test('clone webhook rejects a missing secret header', async () => {
    const { POST, dispatched, createdTokens } = setup()

    const response = await POST(cloneRequest('bot-internal-1'), {
        params: Promise.resolve({ id: 'bot-internal-1' }),
    })

    assert.equal(response.status, 200)
    assert.equal(await readBody(response), '{}')
    assert.deepEqual(dispatched, [])
    assert.deepEqual(createdTokens, [])
})

test('clone webhook rejects a wrong secret', async () => {
    const { POST, dispatched } = setup()

    const response = await POST(cloneRequest('bot-internal-1', 'wrong-secret-value'), {
        params: Promise.resolve({ id: 'bot-internal-1' }),
    })

    assert.equal(response.status, 200)
    assert.equal(await readBody(response), '{}')
    assert.deepEqual(dispatched, [])
})

test('clone webhook rejects a secret with a different length', async () => {
    const { POST, dispatched } = setup()

    const response = await POST(cloneRequest('bot-internal-1', 'short'), {
        params: Promise.resolve({ id: 'bot-internal-1' }),
    })

    assert.equal(response.status, 200)
    assert.deepEqual(dispatched, [])
})

test('clone webhook dispatches updates with a matching secret', async () => {
    const { POST, dispatched, createdTokens } = setup()

    const response = await POST(cloneRequest('bot-internal-1', 'per-clone-secret'), {
        params: Promise.resolve({ id: 'bot-internal-1' }),
    })

    assert.equal(response.status, 200)
    assert.deepEqual(createdTokens, [RECORD.token])
    assert.equal(dispatched.length, 1)
    assert.deepEqual(dispatched[0].bot, { marker: 'clone-bot' })
    assert.equal(dispatched[0].secret, 'per-clone-secret')
    const body = await readBody(response)
    assert.ok(!body.includes(RECORD.token as string))
    assert.ok(!body.includes('per-clone-secret'))
})

test('clone webhook returns ok when the clone bot cannot be created', async () => {
    const POST = createClonesPOST({
        findCloneRecord: async () => RECORD,
        createCloneBot: async () => null,
        dispatchUpdate: async () => {
            throw new Error('must not dispatch without a bot')
        },
    })

    const response = await POST(cloneRequest('bot-internal-1', 'per-clone-secret'), {
        params: Promise.resolve({ id: 'bot-internal-1' }),
    })

    assert.equal(response.status, 200)
    assert.equal(await readBody(response), '{}')
})
