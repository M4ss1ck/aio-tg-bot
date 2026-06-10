import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getWebhookSecretToken } from './webhook-secret'

test('getWebhookSecretToken disables verification when unset or empty', () => {
    assert.equal(getWebhookSecretToken(undefined), undefined)
    assert.equal(getWebhookSecretToken(''), undefined)
})

test('getWebhookSecretToken returns configured secrets unchanged', () => {
    assert.equal(getWebhookSecretToken('secret-token'), 'secret-token')
})
