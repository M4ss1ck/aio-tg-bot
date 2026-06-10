import { spawn } from 'node:child_process'
import { connect } from 'node:net'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const DEFAULT_TG_API = 'https://api.telegram.org'

// Kept in sync with grammY's API_CONSTANTS.ALL_UPDATE_TYPES. grammy cannot be
// imported here: this entrypoint runs under plain `node` in the Next standalone
// image, which only ships the dependencies traced from the Next server, not for
// this script. start-production.test.ts asserts this list matches grammy's so
// drift fails CI.
export const ALL_UPDATE_TYPES = [
    'message',
    'edited_message',
    'channel_post',
    'edited_channel_post',
    'business_connection',
    'business_message',
    'edited_business_message',
    'deleted_business_messages',
    'inline_query',
    'chosen_inline_result',
    'callback_query',
    'shipping_query',
    'pre_checkout_query',
    'purchased_paid_media',
    'poll',
    'poll_answer',
    'my_chat_member',
    'chat_join_request',
    'chat_boost',
    'removed_chat_boost',
    'chat_member',
    'message_reaction',
    'message_reaction_count',
]

/**
 * @param {string | undefined} domain
 */
export function buildWebhookUrl(domain) {
    const value = String(domain ?? '').trim()
    if (!value) {
        throw new Error('NEXT_PUBLIC_DOMAIN is required to build the webhook URL')
    }

    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`
    const url = new URL(withProtocol)
    url.pathname = '/api/bot'
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
}

/**
 * @param {string | undefined} value
 */
export function shouldSetWebhookOnStart(value) {
    const normalized = String(value ?? '').trim().toLowerCase()
    return !['0', 'false', 'no'].includes(normalized)
}

/**
 * @param {Record<string, string | undefined>} env
 */
export function getWebhookStartupConfig(env = process.env) {
    const required = ['TOKEN', 'DATABASE_URL', 'NEXT_PUBLIC_DOMAIN']
    const missing = required.filter((key) => !env[key])

    if (missing.length > 0) {
        throw new Error(`Missing required production env vars: ${missing.join(', ')}`)
    }

    return {
        token: env.TOKEN,
        tgAPI: env.TG_API || DEFAULT_TG_API,
        webhookUrl: buildWebhookUrl(env.NEXT_PUBLIC_DOMAIN),
        secretToken: env.TG_WEBHOOK_SECRET || undefined,
        setWebhookOnStart: shouldSetWebhookOnStart(env.SET_WEBHOOK_ON_START),
    }
}

/**
 * @param {{ token: string, tgAPI: string, webhookUrl: string, secretToken?: string, setWebhookOnStart: boolean }} config
 * @param {typeof fetch} fetchImpl
 */
export async function setProductionWebhook(config, fetchImpl = fetch) {
    if (!config.setWebhookOnStart) {
        console.log('[startup] Skipping Telegram webhook registration')
        return
    }

    const apiRoot = config.tgAPI.replace(/\/$/, '')
    const response = await fetchImpl(`${apiRoot}/bot${config.token}/setWebhook`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            url: config.webhookUrl,
            drop_pending_updates: true,
            allowed_updates: ALL_UPDATE_TYPES,
            ...(config.secretToken ? { secret_token: config.secretToken } : {}),
        }),
    })

    /** @type {{ ok?: boolean, description?: string }} */
    const payload = await response.json().catch(() => ({}))

    if (!response.ok || !payload.ok) {
        throw new Error(payload.description || `Telegram setWebhook failed with HTTP ${response.status}`)
    }

    console.log(`[startup] Telegram webhook set: ${config.webhookUrl}`)
}

/**
 * Resolve once the given port accepts a TCP connection, so the webhook is
 * registered only after the Next.js server is actually listening.
 *
 * @param {{ port: number, host?: string, timeoutMs?: number, intervalMs?: number }} options
 */
export function waitForServerReady({ port, host = '127.0.0.1', timeoutMs = 30000, intervalMs = 250 }) {
    const deadline = Date.now() + timeoutMs
    return new Promise((resolve, reject) => {
        const attempt = () => {
            const socket = connect({ port, host })
            socket.once('connect', () => {
                socket.destroy()
                resolve()
            })
            socket.once('error', () => {
                socket.destroy()
                if (Date.now() > deadline) {
                    reject(new Error(`Server did not start listening on ${host}:${port} within ${timeoutMs}ms`))
                    return
                }
                setTimeout(attempt, intervalMs)
            })
        }
        attempt()
    })
}

export function startNextServer() {
    const serverPath = join(import.meta.dirname, '..', 'server.js')
    const child = spawn(process.execPath, [serverPath], {
        stdio: 'inherit',
        env: process.env,
    })

    child.once('error', (error) => {
        console.error('[startup] Failed to launch the Next.js server')
        console.error(error)
        process.exit(1)
    })

    for (const signal of ['SIGINT', 'SIGTERM']) {
        process.once(signal, () => {
            child.kill(signal)
        })
    }

    child.once('exit', (code, signal) => {
        if (signal) {
            process.kill(process.pid, signal)
            return
        }
        process.exit(code ?? 0)
    })

    return child
}

export async function main() {
    const config = getWebhookStartupConfig()
    startNextServer()

    // Webhook registration must not block or abort the server: a transient
    // Telegram/network failure should leave the app running and serving.
    try {
        await waitForServerReady({ port: Number(process.env.PORT) || 3000 })
        await setProductionWebhook(config)
    } catch (error) {
        console.error('[startup] Telegram webhook registration failed; server continues running')
        console.error(error)
    }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((error) => {
        console.error('[startup] Failed to start production app')
        console.error(error)
        process.exit(1)
    })
}
