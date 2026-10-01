import { Composer, InlineKeyboard } from 'grammy'
import { randomBytes, randomUUID } from 'node:crypto'
import { logger } from '../../utils/logger'
import { prisma } from '../../db/prisma'
import {
    createBot,
    registerManagedCloneWebhook,
    type CloneBotApi,
} from '../../utils/multibots'
import type { PrismaClient } from '../../db/generated/prisma/client'
import type { MyContext } from '../types'

export const MANAGED_CLONE_TTL_MS = 15 * 60 * 1000
const STALE_PROCESSING_MS = 10 * 60 * 1000

export const CLONE_TOKEN_RE = /^[0-9]{8,10}:[a-zA-Z0-9_-]{35}$/

export type ManagedCloneAttemptStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired'

export interface ManagedCloneAttempt {
    ownerId: string
    generation: string
    chatId: string
    createdAt: Date
    updatedAt: Date
    expiresAt: Date
    status: ManagedCloneAttemptStatus
    botTelegramId: string | null
}

export interface SaveAttemptInput {
    ownerId: string
    generation: string
    chatId: string
    createdAt: Date
    expiresAt: Date
}

export interface StoredManagedBot {
    id: string
    owner: string
    telegramId: string
    token: string | null
    quarantined: boolean
    connected: boolean
    webhookSecret: string | null
    lastUpdateId: number | null
}

export interface EnsureManagedBotInput {
    telegramId: string
    owner: string
    webhookSecret: string
}

export interface ManagedCloneStore {
    saveAttempt(input: SaveAttemptInput): Promise<ManagedCloneAttempt>
    getAttempt(ownerId: string): Promise<ManagedCloneAttempt | null>
    claimAttempt(ownerId: string, generation: string, botTelegramId: string, now: Date): Promise<ManagedCloneAttempt | null>
    /** CAS: only transitions the attempt when it is still the given generation. */
    setAttemptStatus(ownerId: string, generation: string, status: ManagedCloneAttemptStatus): Promise<boolean>
    /** Read-only guard used before finalizing a connection. */
    isAttemptCurrent(ownerId: string, generation: string): Promise<boolean>
    findBotByTelegramId(telegramId: string): Promise<StoredManagedBot | null>
    /** Idempotent: returns the existing row when the telegram id is already stored. */
    ensureManagedBot(input: EnsureManagedBotInput): Promise<StoredManagedBot>
    /** Atomic claim; false when another delivery is in flight or the update is not newer. */
    claimBotConnection(telegramId: string, updateId: number, now: Date): Promise<boolean>
    /** Release an in-flight claim so a retry can proceed; keeps lastUpdateId as the last connected update. */
    releaseBotConnection(telegramId: string): Promise<void>
    completeBotConnection(telegramId: string, updateId: number, token?: string): Promise<StoredManagedBot>
    quarantineManagedBot(telegramId: string): Promise<void>
}

export interface ManagedChildBot {
    api: CloneBotApi
}

export type CreateManagedChildBot = (token: string) => Promise<ManagedChildBot | null>
export type RegisterCloneWebhook = (api: CloneBotApi, routeId: string, secret: string) => Promise<boolean>

export interface ManagedCloneDeps {
    store: ManagedCloneStore
    now?: () => Date
    randomSecret?: () => string
    randomId?: () => string
    createChildBot?: CreateManagedChildBot
    registerWebhook?: RegisterCloneWebhook
    adminId?: string
}

export type ManagedCloneEvent = 'offered' | 'completed' | 'expired' | 'failed' | 'unmatched' | 'owner-change'

export function logManagedCloneEvent(
    event: ManagedCloneEvent,
    fields: Record<string, string | number | boolean | undefined> = {},
): void {
    const parts = Object.entries(fields)
        .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined)
        .map(([key, value]) => `${key}=${value}`)
    logger.info(`[managed-clone] event=${event}${parts.length > 0 ? ` ${parts.join(' ')}` : ''}`)
}

// English fallbacks. Production replies come from locales/<lng>.json through ctx.t,
// which the i18n middleware installs before this composer; the constants are used
// when no translation middleware ran (e.g. direct Bot.handleUpdate tests).
export const MANUAL_TOKEN_HINT =
    'Send me the token BotFather gave you right after /clone, e.g. /clone 1234567890:AA…'
export const MANAGED_CLONE_OFFER_TEXT =
    'Tap the button below to create your bot in Telegram. Confirm the name and username there and I will connect it automatically. No token needed.'
export const MANAGED_CLONE_GROUP_REDIRECT_TEXT =
    'Please run /clone in a private chat with me so I can connect the bot to your account.'
export const MANAGED_CLONE_MANUAL_FALLBACK_TEXT =
    'Automatic bot creation is not available right now. You can still connect a bot manually: send me the token from BotFather with /clone.'
export const MANAGED_CLONE_CONNECTION_FAILED_TEXT =
    'Your bot was created, but I could not connect it automatically, so it is not ready yet. Please run /clone again or use the manual token option.'
export const MANAGED_CLONE_EXPIRED_TEXT = 'Your clone request expired. Please run /clone again.'
export const MANAGED_CLONE_OWNER_CHANGE_TEXT =
    'An ownership change was detected for your clone. Automatic management is paused and the operator was notified.'
export const MANAGED_CLONE_CREATE_BUTTON = 'Create bot in Telegram'
export const MANAGED_CLONE_OPEN_CHAT_BUTTON = 'Open private chat'

export function managedCloneSuccessText(username: string): string {
    return `Your bot @${username} is ready!\nOpen it here: https://t.me/${username}`
}

export type ManagedCloneTextKey =
    | 'clone_managed_manual_hint'
    | 'clone_managed_offer'
    | 'clone_managed_group_redirect'
    | 'clone_managed_manual_fallback'
    | 'clone_managed_connection_failed'
    | 'clone_managed_expired'
    | 'clone_managed_owner_change'
    | 'clone_managed_create_button'
    | 'clone_managed_open_chat_button'
    | 'clone_managed_success'

/** Localized managed clone string with an English fallback when ctx.t is unavailable. */
export function translateManagedClone(
    ctx: MyContext,
    key: ManagedCloneTextKey,
    fallback: string,
    options?: Record<string, string>,
): string {
    const translate = ctx.t
    if (typeof translate !== 'function') {
        return fallback
    }
    try {
        const value = options ? translate(key, options) : translate(key)
        return typeof value === 'string' && value !== '' ? value : fallback
    } catch {
        return fallback
    }
}

export function managedCloneAdminAlertText(botTelegramId: string, previousOwner: string, reportedOwner: string): string {
    return (
        'Managed clone security review needed.\n' +
        `Bot ID: ${botTelegramId}\n` +
        `Previous owner: ${previousOwner}\n` +
        `Reported owner: ${reportedOwner}\n` +
        'The clone was quarantined and ownership was not changed. No token is included in this message.'
    )
}

export function extractCloneArg(text: string): string {
    return text.replace(/^\/clone(@\w+)?\s*/i, '').trim()
}

export function suggestedBotName(firstName?: string): string {
    const base = (firstName ?? '').trim().slice(0, 32) || 'My'
    return `${base}'s clone bot`.slice(0, 64)
}

export function buildManagedBotCreationUrl(managerUsername: string, suggestedName: string): string {
    return `https://t.me/newbot/${managerUsername}?name=${encodeURIComponent(suggestedName)}`
}

export function buildPrivateChatUrl(managerUsername: string): string {
    return `https://t.me/${managerUsername}?start=clone`
}

export function isClaimable(attempt: ManagedCloneAttempt, botTelegramId: string, now: Date): boolean {
    if (attempt.status === 'pending') {
        return attempt.expiresAt.getTime() > now.getTime()
    }
    if (attempt.botTelegramId !== botTelegramId) {
        return false
    }
    if (attempt.status === 'failed') {
        return true
    }
    if (attempt.status === 'processing') {
        return attempt.updatedAt.getTime() + STALE_PROCESSING_MS <= now.getTime()
    }
    return false
}

export function createPrismaManagedCloneStore(client: PrismaClient = prisma as unknown as PrismaClient): ManagedCloneStore {
    return {
        async saveAttempt(input) {
            const record = await client.managedCloneAttempt.upsert({
                where: { ownerId: input.ownerId },
                create: {
                    ownerId: input.ownerId,
                    generation: input.generation,
                    chatId: input.chatId,
                    createdAt: input.createdAt,
                    expiresAt: input.expiresAt,
                    status: 'pending',
                    botTelegramId: null,
                },
                update: {
                    generation: input.generation,
                    chatId: input.chatId,
                    createdAt: input.createdAt,
                    expiresAt: input.expiresAt,
                    status: 'pending',
                    botTelegramId: null,
                },
            })
            return toAttempt(record)
        },
        async getAttempt(ownerId) {
            const record = await client.managedCloneAttempt.findUnique({ where: { ownerId } })
            return record ? toAttempt(record) : null
        },
        async claimAttempt(ownerId, generation, botTelegramId, now) {
            const staleBefore = new Date(now.getTime() - STALE_PROCESSING_MS)
            const claimed = await client.managedCloneAttempt.updateMany({
                where: {
                    ownerId,
                    generation,
                    OR: [
                        { status: 'pending', expiresAt: { gt: now } },
                        { status: 'failed', botTelegramId },
                        { status: 'processing', botTelegramId, updatedAt: { lt: staleBefore } },
                    ],
                },
                data: { status: 'processing', botTelegramId },
            })
            if (claimed.count !== 1) {
                return null
            }
            const record = await client.managedCloneAttempt.findUnique({ where: { ownerId } })
            return record ? toAttempt(record) : null
        },
        async setAttemptStatus(ownerId, generation, status) {
            const updated = await client.managedCloneAttempt.updateMany({
                where: { ownerId, generation },
                data: { status },
            })
            return updated.count === 1
        },
        async isAttemptCurrent(ownerId, generation) {
            const record = await client.managedCloneAttempt.findUnique({
                where: { ownerId },
                select: { generation: true },
            })
            return record?.generation === generation
        },
        async findBotByTelegramId(telegramId) {
            const record = await client.bot.findUnique({ where: { telegramId } })
            return record ? toStoredBot(record) : null
        },
        async ensureManagedBot(input) {
            try {
                const created = await client.bot.create({
                    data: {
                        telegramId: input.telegramId,
                        owner: input.owner,
                        webhookSecret: input.webhookSecret,
                        token: null,
                        connected: false,
                        lastUpdateId: null,
                    },
                })
                return toStoredBot(created)
            } catch (error) {
                if ((error as { code?: string } | null)?.code !== 'P2002') {
                    throw error
                }
                const existing = await client.bot.findUnique({ where: { telegramId: input.telegramId } })
                if (!existing) {
                    throw error
                }
                return toStoredBot(existing)
            }
        },
        async claimBotConnection(telegramId, updateId, now) {
            const staleBefore = new Date(now.getTime() - STALE_PROCESSING_MS)
            const claimed = await client.bot.updateMany({
                where: {
                    telegramId,
                    quarantined: false,
                    OR: [
                        { lastUpdateId: null },
                        { lastUpdateId: { lt: updateId } },
                    ],
                    AND: [
                        {
                            OR: [
                                { connectingAt: null },
                                { connectingAt: { lt: staleBefore } },
                            ],
                        },
                    ],
                },
                data: { connectingAt: now },
            })
            return claimed.count === 1
        },
        async releaseBotConnection(telegramId) {
            await client.bot.updateMany({
                where: { telegramId },
                data: { connectingAt: null, connected: false },
            })
        },
        async completeBotConnection(telegramId, updateId, token) {
            const updated = await client.bot.update({
                where: { telegramId },
                data: {
                    connected: true,
                    connectingAt: null,
                    lastUpdateId: updateId,
                    ...(token ? { token } : {}),
                },
            })
            return toStoredBot(updated)
        },
        async quarantineManagedBot(telegramId) {
            await client.bot.updateMany({ where: { telegramId }, data: { quarantined: true } })
        },
    }
}

function toAttempt(record: {
    ownerId: string
    generation: string
    chatId: string
    createdAt: Date
    updatedAt: Date
    expiresAt: Date
    status: string
    botTelegramId: string | null
}): ManagedCloneAttempt {
    return {
        ownerId: record.ownerId,
        generation: record.generation,
        chatId: record.chatId,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        expiresAt: record.expiresAt,
        status: record.status as ManagedCloneAttemptStatus,
        botTelegramId: record.botTelegramId,
    }
}

function toStoredBot(record: {
    id: string
    owner: string
    token: string | null
    telegramId: string | null
    quarantined: boolean
    connected: boolean
    webhookSecret: string | null
    lastUpdateId: number | null
}): StoredManagedBot {
    return {
        id: record.id,
        owner: record.owner,
        token: record.token,
        telegramId: record.telegramId ?? '',
        quarantined: record.quarantined,
        connected: record.connected,
        webhookSecret: record.webhookSecret,
        lastUpdateId: record.lastUpdateId,
    }
}

const defaultCreateChildBot: CreateManagedChildBot = async (token) => {
    const bot = await createBot(token)
    if (!bot) {
        return null
    }
    return {
        api: {
            getMe: () => bot.api.getMe(),
            setWebhook: (url, options) => bot.api.setWebhook(url, options),
            deleteWebhook: () => bot.api.deleteWebhook({ drop_pending_updates: false }),
        },
    }
}

export function createManagedCloneComposer(deps: ManagedCloneDeps): Composer<MyContext> {
    const { store } = deps
    const now = deps.now ?? (() => new Date())
    const randomSecret = deps.randomSecret ?? (() => randomBytes(32).toString('hex'))
    const randomId = deps.randomId ?? (() => randomUUID())
    const createChildBot = deps.createChildBot ?? defaultCreateChildBot
    const registerWebhook = deps.registerWebhook ?? registerManagedCloneWebhook
    const adminId = deps.adminId ?? process.env.ADMIN_ID ?? ''

    const composer = new Composer<MyContext>()

    async function sendToChat(ctx: MyContext, chatId: number | string, text: string): Promise<void> {
        try {
            await ctx.api.sendMessage(chatId, text)
        } catch {
            logger.error('[managed-clone] failed to send message')
        }
    }

    async function connectClone(
        ctx: MyContext,
        input: {
            ownerId: string
            botTelegramId: string
            updateId: number
            chatId: number | string
            record: StoredManagedBot
            attemptGeneration?: string
            isRotation: boolean
        },
    ): Promise<void> {
        const { ownerId, botTelegramId, updateId, chatId, record, attemptGeneration, isRotation } = input

        async function applyAttemptStatus(status: ManagedCloneAttemptStatus): Promise<boolean> {
            if (!attemptGeneration) {
                return true
            }
            try {
                return await store.setAttemptStatus(ownerId, attemptGeneration, status)
            } catch {
                return false
            }
        }

        async function fail(stage: string): Promise<void> {
            try {
                await store.releaseBotConnection(botTelegramId)
            } catch {
                logger.error('[managed-clone] failed to release connection claim')
            }
            const stillCurrent = await applyAttemptStatus('failed')
            if (stillCurrent) {
                await sendToChat(
                    ctx,
                    chatId,
                    translateManagedClone(ctx, 'clone_managed_connection_failed', MANAGED_CLONE_CONNECTION_FAILED_TEXT),
                )
            }
            logManagedCloneEvent('failed', { owner: ownerId, bot: botTelegramId, stage })
        }

        let token = ''
        try {
            token = await ctx.api.getManagedBotToken(Number(botTelegramId))
        } catch {
            token = ''
        }
        if (!token) {
            await fail('token')
            return
        }

        let child: ManagedChildBot | null = null
        try {
            child = await createChildBot(token)
        } catch {
            child = null
        }
        if (!child) {
            await fail('create')
            return
        }

        let identity: { id: number; username?: string } | null = null
        try {
            identity = await child.api.getMe()
        } catch {
            identity = null
        }
        if (!identity || identity.id !== Number(botTelegramId) || !identity.username) {
            await fail('validate')
            return
        }

        if (!record.webhookSecret) {
            await fail('secret')
            return
        }

        let registered = false
        try {
            registered = await registerWebhook(child.api, record.id, record.webhookSecret)
        } catch {
            registered = false
        }
        if (!registered) {
            await fail('webhook')
            return
        }

        // The webhook is live at this point. Check the attempt generation BEFORE
        // writing connected=true so a superseded delivery cannot finalize. If the
        // generation no longer matches, tear the webhook back down so an old clone
        // does not stay active, and leave the (new) attempt untouched/pending.
        async function tearDownWebhook(): Promise<void> {
            try {
                await child?.api.deleteWebhook?.()
            } catch {
                logger.error('[managed-clone] failed to delete superseded clone webhook')
            }
        }

        if (attemptGeneration) {
            let current = false
            try {
                current = await store.isAttemptCurrent(ownerId, attemptGeneration)
            } catch {
                current = false
            }
            if (!current) {
                await tearDownWebhook()
                try {
                    await store.releaseBotConnection(botTelegramId)
                } catch {
                    logger.error('[managed-clone] failed to release superseded connection')
                }
                logManagedCloneEvent('completed', { owner: ownerId, bot: botTelegramId, rotation: isRotation, suppressed: true })
                return
            }
        }

        try {
            await store.completeBotConnection(botTelegramId, updateId, token)
        } catch {
            await tearDownWebhook()
            await fail('persist')
            return
        }

        const stillCurrent = await applyAttemptStatus('completed')
        if (!stillCurrent) {
            await tearDownWebhook()
            try {
                await store.releaseBotConnection(botTelegramId)
            } catch {
                logger.error('[managed-clone] failed to release superseded connection')
            }
            logManagedCloneEvent('completed', { owner: ownerId, bot: botTelegramId, rotation: isRotation, suppressed: true })
            return
        }
        await sendToChat(
            ctx,
            chatId,
            translateManagedClone(
                ctx,
                'clone_managed_success',
                managedCloneSuccessText(identity.username),
                { username: identity.username },
            ),
        )
        logManagedCloneEvent('completed', { owner: ownerId, bot: botTelegramId, rotation: isRotation })
    }

    composer.command('clone', async (ctx, next) => {
        const arg = extractCloneArg(ctx.message?.text ?? '')
        if (arg !== '' && !CLONE_TOKEN_RE.test(arg)) {
            await sendToChat(
                ctx,
                ctx.chat?.id ?? ctx.from?.id ?? 0,
                translateManagedClone(ctx, 'clone_managed_manual_hint', MANUAL_TOKEN_HINT),
            )
            return
        }
        if (CLONE_TOKEN_RE.test(arg)) {
            await next()
            return
        }
        const from = ctx.from
        const chat = ctx.chat
        if (!from || !chat) {
            return
        }
        const ownerId = String(from.id)
        if (chat.type !== 'private') {
            const managerUsername = ctx.me?.username
            if (managerUsername) {
                try {
                    await ctx.reply(
                        translateManagedClone(ctx, 'clone_managed_group_redirect', MANAGED_CLONE_GROUP_REDIRECT_TEXT),
                        {
                            reply_markup: new InlineKeyboard().url(
                                translateManagedClone(ctx, 'clone_managed_open_chat_button', MANAGED_CLONE_OPEN_CHAT_BUTTON),
                                buildPrivateChatUrl(managerUsername),
                            ),
                        },
                    )
                } catch {
                    logger.error('[managed-clone] failed to send message')
                }
            } else {
                await sendToChat(
                    ctx,
                    chat.id,
                    translateManagedClone(ctx, 'clone_managed_group_redirect', MANAGED_CLONE_GROUP_REDIRECT_TEXT),
                )
            }
            logManagedCloneEvent('offered', { owner: ownerId, outcome: 'group-redirect' })
            return
        }

        let manageable = false
        try {
            const me = await ctx.api.getMe()
            manageable = me?.can_manage_bots === true
        } catch {
            manageable = false
        }
        const managerUsername = ctx.me?.username
        if (!manageable || !managerUsername) {
            await sendToChat(
                ctx,
                chat.id,
                translateManagedClone(ctx, 'clone_managed_manual_fallback', MANAGED_CLONE_MANUAL_FALLBACK_TEXT),
            )
            logManagedCloneEvent('offered', { owner: ownerId, outcome: 'manual-fallback' })
            return
        }

        const createdAt = now()
        try {
            await store.saveAttempt({
                ownerId,
                generation: randomId(),
                chatId: String(chat.id),
                createdAt,
                expiresAt: new Date(createdAt.getTime() + MANAGED_CLONE_TTL_MS),
            })
        } catch {
            logger.error('[managed-clone] failed to store clone attempt')
            await sendToChat(
                ctx,
                chat.id,
                translateManagedClone(ctx, 'clone_managed_manual_fallback', MANAGED_CLONE_MANUAL_FALLBACK_TEXT),
            )
            logManagedCloneEvent('offered', { owner: ownerId, outcome: 'manual-fallback' })
            return
        }
        try {
            await ctx.reply(
                translateManagedClone(ctx, 'clone_managed_offer', MANAGED_CLONE_OFFER_TEXT),
                {
                    reply_markup: new InlineKeyboard().url(
                        translateManagedClone(ctx, 'clone_managed_create_button', MANAGED_CLONE_CREATE_BUTTON),
                        buildManagedBotCreationUrl(managerUsername, suggestedBotName(from.first_name)),
                    ),
                },
            )
        } catch {
            logger.error('[managed-clone] failed to send message')
        }
        logManagedCloneEvent('offered', { owner: ownerId, outcome: 'offered' })
    })

    // Residual limit (documented, not solved): Telegram's managed-bot creation
    // deep link (https://t.me/newbot/<manager>?name=...) carries NO nonce, so an
    // incoming managed_bot update cannot be attributed to a specific prior /clone
    // offer. The only correlation is the authenticated owner id plus the binding
    // rules below. If a user leaves an old creation link open and runs /clone
    // again, a later creation from the OLD link can bind to the NEW attempt
    // (owner matches; the new attempt is unbound). We cannot distinguish the two
    // without a pairing nonce, which the deep-link format does not support.
    composer.on('managed_bot', async (ctx) => {
        const info = ctx.managedBot
        if (!info) {
            return
        }
        const ownerId = String(info.user.id)
        const botTelegramId = String(info.bot.id)
        const updateId = ctx.update.update_id
        const at = now()

        let existing: StoredManagedBot | null = null
        try {
            existing = await store.findBotByTelegramId(botTelegramId)
        } catch {
            existing = null
        }

        if (existing) {
            if (existing.quarantined) {
                logManagedCloneEvent('unmatched', { owner: ownerId, bot: botTelegramId, reason: 'quarantined' })
                return
            }
            if (existing.owner !== ownerId) {
                try {
                    await store.quarantineManagedBot(botTelegramId)
                } catch {
                    logger.error('[managed-clone] failed to quarantine clone')
                }
                if (adminId) {
                    await sendToChat(
                        ctx,
                        adminId,
                        managedCloneAdminAlertText(botTelegramId, existing.owner, ownerId),
                    )
                }
                await sendToChat(
                    ctx,
                    info.user.id,
                    translateManagedClone(ctx, 'clone_managed_owner_change', MANAGED_CLONE_OWNER_CHANGE_TEXT),
                )
                logManagedCloneEvent('owner-change', { owner: ownerId, bot: botTelegramId })
                return
            }
            if (existing.lastUpdateId != null && updateId <= existing.lastUpdateId) {
                logManagedCloneEvent('unmatched', { owner: ownerId, bot: botTelegramId, reason: 'duplicate' })
                return
            }

            // Binding gate. A never-connected placeholder row (created by
            // ensureManagedBot before its first webhook succeeded) may only be
            // retried while the owner still holds a CURRENT, unexpired attempt
            // bound to this exact bot id. Otherwise an unmatched, superseded or
            // expired update could enroll a bot and defeat the 15-minute window.
            let boundAttempt: ManagedCloneAttempt | null = null
            try {
                boundAttempt = await store.getAttempt(ownerId)
            } catch {
                boundAttempt = null
            }
            let attemptGeneration: string | undefined
            const neverConnected = existing.lastUpdateId == null
            if (!existing.connected && neverConnected) {
                if (
                    !boundAttempt ||
                    boundAttempt.botTelegramId !== botTelegramId ||
                    boundAttempt.expiresAt.getTime() <= at.getTime()
                ) {
                    logManagedCloneEvent('unmatched', { owner: ownerId, bot: botTelegramId, reason: 'no-current-attempt' })
                    return
                }
                attemptGeneration = boundAttempt.generation
            } else if (
                boundAttempt &&
                boundAttempt.botTelegramId === botTelegramId &&
                (boundAttempt.status === 'failed' || boundAttempt.status === 'processing') &&
                boundAttempt.expiresAt.getTime() > at.getTime()
            ) {
                // A previously connected clone (rotation) is trusted by owner match
                // and may additionally be tracked by a live bound attempt.
                attemptGeneration = boundAttempt.generation
            }

            const claimed = await store.claimBotConnection(botTelegramId, updateId, at)
            if (!claimed) {
                logManagedCloneEvent('unmatched', { owner: ownerId, bot: botTelegramId, reason: 'in-flight' })
                return
            }
            await connectClone(ctx, {
                ownerId,
                botTelegramId,
                updateId,
                chatId: info.user.id,
                record: existing,
                attemptGeneration,
                isRotation: existing.connected,
            })
            return
        }

        let attempt: ManagedCloneAttempt | null = null
        try {
            attempt = await store.getAttempt(ownerId)
        } catch {
            attempt = null
        }
        if (!attempt) {
            logManagedCloneEvent('unmatched', { owner: ownerId, bot: botTelegramId, reason: 'no-attempt' })
            return
        }
        if (attempt.expiresAt.getTime() <= at.getTime()) {
            try {
                await store.setAttemptStatus(ownerId, attempt.generation, 'expired')
            } catch {
                logger.error('[managed-clone] failed to record expired attempt')
            }
            await sendToChat(
                ctx,
                attempt.chatId,
                translateManagedClone(ctx, 'clone_managed_expired', MANAGED_CLONE_EXPIRED_TEXT),
            )
            logManagedCloneEvent('expired', { owner: ownerId, bot: botTelegramId })
            return
        }
        const claimedAttempt = await store.claimAttempt(ownerId, attempt.generation, botTelegramId, at)
        if (!claimedAttempt) {
            logManagedCloneEvent('unmatched', { owner: ownerId, bot: botTelegramId, reason: 'claim-rejected' })
            return
        }

        let record: StoredManagedBot | null = null
        try {
            record = await store.ensureManagedBot({
                telegramId: botTelegramId,
                owner: ownerId,
                webhookSecret: randomSecret(),
            })
        } catch {
            record = null
        }
        if (!record) {
            const stillCurrent = await store
                .setAttemptStatus(ownerId, attempt.generation, 'failed')
                .catch(() => false)
            if (stillCurrent) {
                await sendToChat(
                    ctx,
                    claimedAttempt.chatId,
                    translateManagedClone(ctx, 'clone_managed_connection_failed', MANAGED_CLONE_CONNECTION_FAILED_TEXT),
                )
            }
            logManagedCloneEvent('failed', { owner: ownerId, bot: botTelegramId, stage: 'storage' })
            return
        }

        const claimedBot = await store.claimBotConnection(botTelegramId, updateId, at)
        if (!claimedBot) {
            logManagedCloneEvent('unmatched', { owner: ownerId, bot: botTelegramId, reason: 'in-flight' })
            return
        }

        await connectClone(ctx, {
            ownerId,
            botTelegramId,
            updateId,
            chatId: claimedAttempt.chatId,
            record,
            attemptGeneration: attempt.generation,
            isRotation: false,
        })
    })

    return composer
}
