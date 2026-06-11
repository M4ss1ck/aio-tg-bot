import type { WebhookOptions } from 'grammy'
import { logger } from '../utils/logger'

const WEBHOOK_TIMEOUT_MS = 9000

export function getWebhookOptions(secretToken?: string): WebhookOptions {
    return {
        onTimeout: 'return',
        timeoutMilliseconds: WEBHOOK_TIMEOUT_MS,
        ...(secretToken ? { secretToken } : {}),
    }
}

/**
 * Log the incoming update id and contained kinds. Only does work when
 * LOG_LEVEL=debug, so it adds no overhead (no body clone) in production.
 */
export async function logIncomingUpdate(request: Request, source: string): Promise<void> {
    if (process.env.LOG_LEVEL !== 'debug') return
    try {
        const update = await request.clone().json()
        const kinds = Object.keys(update).filter(k => k !== 'update_id').join(',') || 'unknown'
        logger.debug(`[webhook:${source}] update ${update.update_id} (${kinds})`)
    } catch {
        // Never let logging interfere with update handling.
    }
}
