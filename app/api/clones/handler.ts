import { timingSafeEqual } from 'node:crypto'
import { logger } from '../../../utils/logger'
import { logIncomingUpdate } from '../../../telegram/webhook-options'

export interface CloneRouteRecord {
    token: string | null
    webhookSecret: string | null
    quarantined: boolean
    connected: boolean
}

export interface CloneRouteDeps {
    findCloneRecord: (id: string) => Promise<CloneRouteRecord | null>
    createCloneBot: (token: string) => Promise<unknown>
    dispatchUpdate: (bot: unknown, request: Request, secret: string) => Promise<Response>
}

function secretsMatch(provided: string | null, expected: string): boolean {
    if (!provided) {
        return false
    }
    const providedBytes = Buffer.from(provided)
    const expectedBytes = Buffer.from(expected)
    if (providedBytes.length !== expectedBytes.length) {
        return false
    }
    return timingSafeEqual(providedBytes, expectedBytes)
}

function emptyOk(): Response {
    return Response.json({}, { status: 200 })
}

export function createClonesPOST(deps: CloneRouteDeps) {
    return async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
        const { id } = await params
        let record: CloneRouteRecord | null = null
        try {
            record = await deps.findCloneRecord(id)
        } catch {
            record = null
        }
        if (!record || record.quarantined || !record.connected || !record.token || !record.webhookSecret) {
            return emptyOk()
        }
        const header = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
        if (!secretsMatch(header, record.webhookSecret)) {
            return emptyOk()
        }
        let bot: unknown = null
        try {
            bot = await deps.createCloneBot(record.token)
        } catch {
            bot = null
        }
        if (!bot) {
            return emptyOk()
        }
        try {
            await logIncomingUpdate(request, 'clone')
            return await deps.dispatchUpdate(bot, request, record.webhookSecret)
        } catch {
            logger.error('[clones] failed to handle clone update')
            return emptyOk()
        }
    }
}