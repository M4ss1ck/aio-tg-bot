import assert from 'node:assert/strict'
import { test } from 'node:test'
import { API_CONSTANTS } from 'grammy'
import {
    ALL_UPDATE_TYPES,
    buildWebhookUrl,
    getWebhookStartupConfig,
    setProductionWebhook,
    shouldSetWebhookOnStart,
} from './start-production.mjs'

test('ALL_UPDATE_TYPES stays in sync with grammy (it cannot be imported at runtime)', () => {
    assert.deepEqual(ALL_UPDATE_TYPES, [...API_CONSTANTS.ALL_UPDATE_TYPES])
})

test('buildWebhookUrl normalizes domains and appends the bot route', () => {
    assert.equal(buildWebhookUrl('https://bot.example.com/'), 'https://bot.example.com/api/bot')
    assert.equal(buildWebhookUrl('bot.example.com'), 'https://bot.example.com/api/bot')
    assert.equal(buildWebhookUrl('http://localhost:3000'), 'http://localhost:3000/api/bot')
})

test('shouldSetWebhookOnStart defaults to enabled and accepts false-like opt-outs', () => {
    assert.equal(shouldSetWebhookOnStart(undefined), true)
    assert.equal(shouldSetWebhookOnStart(''), true)
    assert.equal(shouldSetWebhookOnStart('true'), true)
    assert.equal(shouldSetWebhookOnStart('0'), false)
    assert.equal(shouldSetWebhookOnStart('false'), false)
    assert.equal(shouldSetWebhookOnStart('no'), false)
})

test('getWebhookStartupConfig requires production deployment environment', () => {
    assert.throws(
        () => getWebhookStartupConfig({ TOKEN: 'token', NEXT_PUBLIC_DOMAIN: 'https://bot.example.com' }),
        /DATABASE_URL/,
    )

    assert.deepEqual(
        getWebhookStartupConfig({
            TOKEN: 'token',
            DATABASE_URL: 'postgres://user:pass@db:5432/app',
            NEXT_PUBLIC_DOMAIN: 'https://bot.example.com/',
            TG_API: 'https://telegram.example.test',
            TG_WEBHOOK_SECRET: 's3cret',
            SET_WEBHOOK_ON_START: 'false',
        }),
        {
            token: 'token',
            tgAPI: 'https://telegram.example.test',
            webhookUrl: 'https://bot.example.com/api/bot',
            secretToken: 's3cret',
            setWebhookOnStart: false,
        },
    )
})

test('setProductionWebhook posts webhook settings to the Telegram API', async () => {
    const calls: Array<{ url: string, init: RequestInit }> = []
    const fakeFetch: typeof fetch = async (url, init) => {
        assert.ok(init)
        calls.push({ url: String(url), init })
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }

    await setProductionWebhook({
        token: '123:abc',
        tgAPI: 'https://telegram.example.test',
        webhookUrl: 'https://bot.example.com/api/bot',
        secretToken: 's3cret',
        setWebhookOnStart: true,
    }, fakeFetch)

    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, 'https://telegram.example.test/bot123:abc/setWebhook')
    assert.equal(calls[0].init.method, 'POST')
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
        url: 'https://bot.example.com/api/bot',
        drop_pending_updates: true,
        allowed_updates: ALL_UPDATE_TYPES,
        secret_token: 's3cret',
    })
})

test('setProductionWebhook omits secret_token when none is configured', async () => {
    let body: unknown
    const fakeFetch: typeof fetch = async (_url, init) => {
        body = JSON.parse(String(init?.body))
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }

    await setProductionWebhook({
        token: '123:abc',
        tgAPI: 'https://telegram.example.test',
        webhookUrl: 'https://bot.example.com/api/bot',
        setWebhookOnStart: true,
    }, fakeFetch)

    assert.deepEqual(body, {
        url: 'https://bot.example.com/api/bot',
        drop_pending_updates: true,
        allowed_updates: ALL_UPDATE_TYPES,
    })
})
