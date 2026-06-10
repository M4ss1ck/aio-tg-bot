import { Bot, API_CONSTANTS } from 'grammy'
import { getWebhookSecretToken } from '../telegram/webhook-secret'

const token = process.env.TOKEN
const domain = process.env.NEXT_PUBLIC_DOMAIN

if (!token) {
    console.error('Error: TOKEN is not set')
    process.exit(1)
}

if (!domain) {
    console.error('Error: NEXT_PUBLIC_DOMAIN is not set')
    process.exit(1)
}

const cleanDomain = domain.replace(/^http(s)?:\/\//, '').replace(/\/$/, '')
const webhookUrl = `https://${cleanDomain}/api/bot`

const bot = new Bot(token)

try {
    await bot.api.setWebhook(webhookUrl, {
        drop_pending_updates: true,
        allowed_updates: API_CONSTANTS.ALL_UPDATE_TYPES,
        secret_token: getWebhookSecretToken(),
    })
    console.log(`Webhook set: ${webhookUrl}`)
} catch (error) {
    console.error('Failed to set webhook:', error)
    process.exit(1)
}
