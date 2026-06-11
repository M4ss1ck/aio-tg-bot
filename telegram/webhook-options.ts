import type { WebhookOptions } from 'grammy'

const WEBHOOK_TIMEOUT_MS = 9000

export function getWebhookOptions(secretToken?: string): WebhookOptions {
    return {
        onTimeout: 'return',
        timeoutMilliseconds: WEBHOOK_TIMEOUT_MS,
        ...(secretToken ? { secretToken } : {}),
    }
}
