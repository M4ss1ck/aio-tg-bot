import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getWebhookOptions } from './webhook-options'

test('webhook options return before Telegram retries slow updates', () => {
    assert.deepEqual(getWebhookOptions(), {
        onTimeout: 'return',
        timeoutMilliseconds: 9000,
    })
})

test('webhook options include the secret token when provided', () => {
    assert.deepEqual(getWebhookOptions('secret'), {
        onTimeout: 'return',
        timeoutMilliseconds: 9000,
        secretToken: 'secret',
    })
})
