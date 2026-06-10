export function getWebhookSecretToken(value = process.env.TG_WEBHOOK_SECRET): string | undefined {
    return value || undefined
}
