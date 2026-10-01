import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Bot, type MiddlewareFn } from 'grammy'
import {
    createManagedCloneComposer,
    isClaimable,
    managedCloneSuccessText,
    MANAGED_CLONE_CREATE_BUTTON,
    MANAGED_CLONE_OFFER_TEXT,
    type ManagedChildBot,
    type ManagedCloneAttempt,
    type ManagedCloneStore,
    type ManagedCloneAttemptStatus,
    type StoredManagedBot,
} from './managedClone'
import { registerManagedCloneWebhook, type CloneBotApi } from '../../utils/multibots'
import { createClonesPOST } from '../../app/api/clones/handler'
import esMessages from '../../locales/es.json'
import type { MyContext } from '../types'

const MAIN_BOT_USERNAME = 'mainbot'
const CHILD_TOKEN = '555666777:AAH-child-managed-token-value-0123456789X'
const CHILD_USERNAME = 'myclonebot'
const STALE_MS = 10 * 60 * 1000

interface SentMessage {
    chatId: number | string
    text: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any
}

interface MemoryBotRecord extends StoredManagedBot {
    connectingAt: Date | null
}

function stripBot(record: MemoryBotRecord): StoredManagedBot {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { connectingAt: _connectingAt, ...rest } = record
    return rest
}

export function createMemoryCloneStore(): ManagedCloneStore & {
    attempts: Map<string, ManagedCloneAttempt>
    bots: Map<string, MemoryBotRecord>
} {
    const attempts = new Map<string, ManagedCloneAttempt>()
    const bots = new Map<string, MemoryBotRecord>()
    let botSeq = 0
    return {
        attempts,
        bots,
        async saveAttempt(input) {
            const record: ManagedCloneAttempt = {
                ownerId: input.ownerId,
                generation: input.generation,
                chatId: input.chatId,
                createdAt: input.createdAt,
                updatedAt: input.createdAt,
                expiresAt: input.expiresAt,
                status: 'pending',
                botTelegramId: null,
            }
            attempts.set(input.ownerId, record)
            return record
        },
        async getAttempt(ownerId) {
            return attempts.get(ownerId) ?? null
        },
        async claimAttempt(ownerId, generation, botTelegramId, now) {
            const current = attempts.get(ownerId)
            if (!current || current.generation !== generation) return null
            if (!isClaimable(current, botTelegramId, now)) return null
            const claimed: ManagedCloneAttempt = {
                ...current,
                status: 'processing',
                botTelegramId,
                updatedAt: now,
            }
            attempts.set(ownerId, claimed)
            return claimed
        },
        async setAttemptStatus(ownerId: string, generation: string, status: ManagedCloneAttemptStatus) {
            const current = attempts.get(ownerId)
            if (!current || current.generation !== generation) return false
            attempts.set(ownerId, { ...current, status, updatedAt: new Date() })
            return true
        },
        async isAttemptCurrent(ownerId, generation) {
            return attempts.get(ownerId)?.generation === generation
        },
        async findBotByTelegramId(telegramId) {
            const record = bots.get(telegramId)
            return record ? stripBot(record) : null
        },
        async ensureManagedBot(input) {
            const existing = bots.get(input.telegramId)
            if (existing) return stripBot(existing)
            botSeq += 1
            const record: MemoryBotRecord = {
                id: `bot-internal-${botSeq}`,
                owner: input.owner,
                telegramId: input.telegramId,
                token: null,
                quarantined: false,
                connected: false,
                webhookSecret: input.webhookSecret,
                lastUpdateId: null,
                connectingAt: null,
            }
            bots.set(input.telegramId, record)
            return stripBot(record)
        },
        async claimBotConnection(telegramId, updateId, now) {
            const record = bots.get(telegramId)
            if (!record || record.quarantined) return false
            const newer = record.lastUpdateId == null || record.lastUpdateId < updateId
            if (!newer) return false
            const stale =
                record.connectingAt != null && now.getTime() - record.connectingAt.getTime() >= STALE_MS
            if (record.connectingAt != null && !stale) return false
            bots.set(telegramId, { ...record, connectingAt: now })
            return true
        },
        async releaseBotConnection(telegramId) {
            const record = bots.get(telegramId)
            if (!record) return
            bots.set(telegramId, { ...record, connectingAt: null, connected: false })
        },
        async completeBotConnection(telegramId, updateId, token) {
            const record = bots.get(telegramId)
            assert.ok(record, 'expected existing bot for completion')
            const updated: MemoryBotRecord = {
                ...record,
                connected: true,
                connectingAt: null,
                lastUpdateId: updateId,
                token: token ?? record.token,
            }
            bots.set(telegramId, updated)
            return stripBot(updated)
        },
        async quarantineManagedBot(telegramId) {
            const record = bots.get(telegramId)
            if (!record) return
            bots.set(telegramId, { ...record, quarantined: true })
        },
    }
}

export interface CloneTestSetup {
    bot: Bot<MyContext>
    store: ReturnType<typeof createMemoryCloneStore>
    sent: SentMessage[]
    tokenCalls: number[]
    webhookCalls: Array<{ url: string; secret?: string }>
    deletedWebhooks: { count: number }
    seenChildTokens: string[]
    options: {
        canManageBots: boolean
        getMeError: boolean
        managedTokenError: boolean
        childMe: { id: number; username?: string }
        createChildBotResult: 'ok' | 'null'
        webhookOk: boolean
        webhookGate: Promise<void> | null
        now: Date
        /** When set, a test-only i18n middleware is installed before the clone composer. */
        locale: 'es' | null
    }
}

const localeCatalogs: Record<'es', Record<string, string>> = { es: esMessages }

/** Test-only stand-in for the production i18n middleware: resolves the locale JSON with i18next-style `{{var}}`. */
function localeMiddleware(locale: 'es'): MiddlewareFn<MyContext> {
    const catalog = localeCatalogs[locale]
    return async (ctx, next) => {
        ctx.t = ((key: string, options?: Record<string, unknown>) => {
            const template = catalog[key]
            if (typeof template !== 'string') {
                return key
            }
            return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(options?.[name] ?? ''))
        }) as MyContext['t']
        await next()
    }
}

export function setupCloneTest(overrides?: Partial<CloneTestSetup['options']>): CloneTestSetup {
    const store = createMemoryCloneStore()
    const sent: SentMessage[] = []
    const tokenCalls: number[] = []
    const webhookCalls: Array<{ url: string; secret?: string }> = []
    const deletedWebhooks = { count: 0 }
    const seenChildTokens: string[] = []
    const options: CloneTestSetup['options'] = {
        canManageBots: true,
        getMeError: false,
        managedTokenError: false,
        childMe: { id: 222, username: CHILD_USERNAME },
        createChildBotResult: 'ok',
        webhookOk: true,
        webhookGate: null,
        now: new Date('2026-10-01T12:00:00.000Z'),
        locale: null,
        ...overrides,
    }

    const bot = new Bot<MyContext>('123456:main-test-token', {
        botInfo: {
            id: 999,
            is_bot: true,
            first_name: 'Main',
            username: MAIN_BOT_USERNAME,
            can_join_groups: true,
            can_read_all_group_messages: false,
            supports_inline_queries: false,
            can_connect_to_business: false,
            has_main_web_app: false,
            has_topics_enabled: false,
            allows_users_to_create_topics: false,
            can_manage_bots: true,
            supports_join_request_queries: false,
        },
    })

    bot.api.config.use(async (prev, method, payload) => {
        // Transformer fakes must return the raw Telegram envelope; grammy unwraps `result`.
        if (method === 'getMe') {
            if (options.getMeError) throw new Error('getMe unavailable')
            return { ok: true, result: { ...bot.botInfo, can_manage_bots: options.canManageBots } } as never
        }
        if (method === 'sendMessage') {
            const body = payload as { chat_id: number | string; text: string }
            sent.push({ chatId: body.chat_id, text: body.text, payload })
            return {
                ok: true,
                result: {
                    message_id: 1,
                    date: 1,
                    chat: { id: body.chat_id, type: 'private', first_name: 'Ada' },
                    from: { id: 999, is_bot: true, first_name: 'Main' },
                    text: body.text,
                },
            } as never
        }
        if (method === 'getManagedBotToken') {
            const body = payload as { user_id: number }
            tokenCalls.push(body.user_id)
            if (options.managedTokenError) throw new Error('token unavailable')
            return { ok: true, result: CHILD_TOKEN } as never
        }
        throw new Error(`unexpected Telegram API call in test: ${method}`)
    })

    const createChildBot = async (token: string): Promise<ManagedChildBot | null> => {
        seenChildTokens.push(token)
        if (options.createChildBotResult === 'null') return null
        return {
            api: {
                getMe: async () => ({ ...options.childMe }),
                setWebhook: async (url: string, opts?: { secret_token?: string }) => {
                    webhookCalls.push({ url, secret: opts?.secret_token })
                    return true
                },
                deleteWebhook: async () => {
                    deletedWebhooks.count += 1
                    return true
                },
            },
        }
    }

    if (options.locale) {
        // Mirrors production ordering: i18n runs before the clone composer.
        bot.use(localeMiddleware(options.locale))
    }

    bot.use(
        createManagedCloneComposer({
            store,
            now: () => new Date(options.now),
            randomSecret: () => 'fixed-clone-secret',
            randomId: () => `gen-${store.attempts.size + 1}-${Math.random().toString(36).slice(2)}`,
            createChildBot,
            registerWebhook: async (api, routeId, secret) => {
                if (options.webhookGate) await options.webhookGate
                if (!options.webhookOk) return false
                await api.setWebhook(`https://bot.example.test/api/clones/${routeId}`, {
                    secret_token: secret,
                    drop_pending_updates: false,
                })
                return true
            },
            adminId: '4242',
        }),
    )

    return { bot, store, sent, tokenCalls, webhookCalls, deletedWebhooks, seenChildTokens, options }
}

export function privateCloneCommand(
    text: string,
    { fromId = 111, chatId = 111, updateId = 1 }: { fromId?: number; chatId?: number; updateId?: number } = {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
    return {
        update_id: updateId,
        message: {
            message_id: 1,
            date: 1,
            chat: { id: chatId, type: 'private', first_name: 'Ada' },
            from: { id: fromId, is_bot: false, first_name: 'Ada' },
            text,
            entities: [{ type: 'bot_command', offset: 0, length: text.startsWith('/clone@') ? 11 : 6 }],
        },
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function groupCloneCommand(text = '/clone'): any {
    return {
        update_id: 10,
        message: {
            message_id: 2,
            date: 1,
            chat: { id: -100, type: 'group', title: 'Group' },
            from: { id: 111, is_bot: false, first_name: 'Ada' },
            text,
            entities: [{ type: 'bot_command', offset: 0, length: 6 }],
        },
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function managedBotUpdate({ updateId = 2, userId = 111, botId = 222 }: { updateId?: number; userId?: number; botId?: number } = {}): any {
    return {
        update_id: updateId,
        managed_bot: {
            user: { id: userId, is_bot: false, first_name: 'Ada' },
            bot: { id: botId, is_bot: true, first_name: 'Clone', username: 'clonebot' },
        },
    }
}

function connectedBot(overrides: Partial<MemoryBotRecord> = {}): MemoryBotRecord {
    return {
        id: 'bot-internal-9',
        owner: '111',
        telegramId: '222',
        token: 'old-token',
        quarantined: false,
        connected: true,
        webhookSecret: 'stable-secret',
        lastUpdateId: 1,
        connectingAt: null,
        ...overrides,
    }
}

function settle(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 20))
}

test('managed clone happy path: /clone offer then managed_bot update connects the clone', async () => {
    const { bot, store, sent, tokenCalls, webhookCalls, seenChildTokens } = setupCloneTest()

    await bot.handleUpdate(privateCloneCommand('/clone'))

    assert.equal(sent.length, 1)
    const offer = sent[0]
    const markup = offer.payload.reply_markup?.inline_keyboard as Array<Array<{ text: string; url?: string }>> | undefined
    assert.ok(markup, 'offer must include an inline keyboard')
    const button = markup.flat()[0]
    assert.ok(button.url?.startsWith(`https://t.me/newbot/${MAIN_BOT_USERNAME}?name=`), `unexpected creation URL: ${button.url}`)
    const attempt = await store.getAttempt('111')
    assert.ok(attempt, 'pending attempt must be stored')
    assert.equal(attempt.status, 'pending')
    assert.equal(attempt.chatId, '111')
    assert.ok(attempt.generation.length > 0, 'attempt must carry a generation id')
    assert.ok(attempt.expiresAt.getTime() - attempt.createdAt.getTime() === 15 * 60 * 1000)

    await bot.handleUpdate(managedBotUpdate())

    assert.deepEqual(tokenCalls, [222])
    assert.deepEqual(seenChildTokens, [CHILD_TOKEN])
    const record = await store.findBotByTelegramId('222')
    assert.ok(record, 'clone must be stored')
    assert.equal(record.owner, '111')
    assert.equal(record.quarantined, false)
    assert.equal(record.connected, true)
    assert.equal(record.lastUpdateId, 2)
    assert.equal(record.token, CHILD_TOKEN)
    assert.equal(webhookCalls.length, 1)
    assert.ok(webhookCalls[0].url.startsWith('https://bot.example.test/api/clones/'))
    assert.ok(!webhookCalls[0].url.includes(CHILD_TOKEN))
    assert.equal(webhookCalls[0].secret, 'fixed-clone-secret')

    assert.equal(sent.length, 2)
    const success = sent[1]
    assert.ok(success.text.includes(`https://t.me/${CHILD_USERNAME}`))
    assert.ok(!success.payload.reply_markup, 'success must not include a second webhook button')
    const allChatContent = JSON.stringify(sent.map((message) => ({ text: message.text, markup: message.payload.reply_markup })))
    assert.ok(!allChatContent.includes(CHILD_TOKEN), 'managed token must never appear in chat')
    assert.ok(!allChatContent.includes('fixed-clone-secret'), 'webhook secret must never appear in chat')
    assert.equal((await store.getAttempt('111'))?.status, 'completed')
})

test('managed clone replies follow the user locale', async () => {
    const { bot, store, sent } = setupCloneTest({ locale: 'es' })

    await bot.handleUpdate(privateCloneCommand('/clone'))

    assert.equal(sent.length, 1)
    const offer = sent[0]
    assert.equal(offer.text, esMessages.clone_managed_offer)
    assert.notEqual(offer.text, MANAGED_CLONE_OFFER_TEXT, 'the English constant must not leak when a locale is active')
    const markup = offer.payload.reply_markup?.inline_keyboard as Array<Array<{ text: string; url?: string }>> | undefined
    assert.ok(markup, 'offer must include an inline keyboard')
    const button = markup.flat()[0]
    assert.equal(button.text, esMessages.clone_managed_create_button)
    assert.notEqual(button.text, MANAGED_CLONE_CREATE_BUTTON)
    assert.ok(button.url?.startsWith(`https://t.me/newbot/${MAIN_BOT_USERNAME}?name=`), `unexpected creation URL: ${button.url}`)

    await bot.handleUpdate(managedBotUpdate())

    assert.equal(sent.length, 2)
    assert.equal(sent[1].text, esMessages.clone_managed_success.replaceAll('{{username}}', CHILD_USERNAME))
    assert.notEqual(sent[1].text, managedCloneSuccessText(CHILD_USERNAME))
    assert.equal((await store.getAttempt('111'))?.status, 'completed')
})

test('no-token /clone without manager permission falls back to the manual path', async () => {
    const { bot, store, sent, tokenCalls } = setupCloneTest({ canManageBots: false })

    await bot.handleUpdate(privateCloneCommand('/clone'))

    assert.equal(sent.length, 1)
    assert.ok(sent[0].text.includes('manually'))
    assert.ok(sent[0].text.includes('BotFather'))
    assert.equal(await store.getAttempt('111'), null)
    assert.deepEqual(tokenCalls, [])
})

test('no-token /clone with a getMe API error falls back to the manual path', async () => {
    const { bot, store, sent } = setupCloneTest({ getMeError: true })

    await bot.handleUpdate(privateCloneCommand('/clone'))

    assert.equal(sent.length, 1)
    assert.ok(sent[0].text.includes('manually'))
    assert.equal(await store.getAttempt('111'), null)
})

test('group /clone redirects to a private chat without storing an attempt', async () => {
    const { bot, store, sent } = setupCloneTest()

    await bot.handleUpdate(groupCloneCommand())

    assert.equal(sent.length, 1)
    assert.ok(sent[0].text.includes('private chat'))
    const markup = sent[0].payload.reply_markup?.inline_keyboard as Array<Array<{ url?: string }>> | undefined
    assert.ok(markup?.flat()[0]?.url?.startsWith(`https://t.me/${MAIN_BOT_USERNAME}?start=`))
    assert.equal(await store.getAttempt('111'), null)
})

test('malformed manual token keeps the BotFather hint', async () => {
    const { bot, store, sent } = setupCloneTest()

    await bot.handleUpdate(privateCloneCommand('/clone not-a-token'))

    assert.equal(sent.length, 1)
    assert.ok(sent[0].text.includes('BotFather'))
    assert.equal(await store.getAttempt('111'), null)
})

test('valid manual token passes through the managed layer untouched', async () => {
    const { bot, store, sent } = setupCloneTest()
    const token = `123456789:${'A'.repeat(35)}`

    await bot.handleUpdate(privateCloneCommand(`/clone ${token}`))

    assert.equal(sent.length, 0)
    assert.equal(await store.getAttempt('111'), null)
})

test('expired attempt is recorded and never enrolls the bot', async () => {
    const { bot, store, sent, tokenCalls, seenChildTokens } = setupCloneTest()
    store.attempts.set('111', {
        ownerId: '111',
        generation: 'gen-old',
        chatId: '111',
        createdAt: new Date('2026-10-01T11:00:00.000Z'),
        updatedAt: new Date('2026-10-01T11:00:00.000Z'),
        expiresAt: new Date('2026-10-01T11:15:00.000Z'),
        status: 'pending',
        botTelegramId: null,
    })

    await bot.handleUpdate(managedBotUpdate())

    assert.equal((await store.getAttempt('111'))?.status, 'expired')
    assert.deepEqual(tokenCalls, [])
    assert.deepEqual(seenChildTokens, [])
    assert.equal(await store.findBotByTelegramId('222'), null)
    assert.equal(sent.length, 1)
    assert.ok(sent[0].text.includes('/clone again'))
})

test('a new /clone supersedes the previous pending attempt', async () => {
    const setup = setupCloneTest()
    const { bot, store, sent } = setup

    await bot.handleUpdate(privateCloneCommand('/clone', { updateId: 1 }))
    setup.options.now = new Date('2026-10-01T12:05:00.000Z')
    await bot.handleUpdate(privateCloneCommand('/clone', { updateId: 2 }))

    assert.equal(sent.length, 2)
    assert.equal(store.attempts.size, 1)
    const attempt = await store.getAttempt('111')
    assert.equal(attempt?.status, 'pending')
    assert.equal(attempt?.createdAt.toISOString(), '2026-10-01T12:05:00.000Z')
    assert.equal(attempt?.expiresAt.toISOString(), '2026-10-01T12:20:00.000Z')

    await bot.handleUpdate(managedBotUpdate({ updateId: 3 }))
    assert.equal(sent.length, 3)
    assert.ok(sent[2].text.includes(`https://t.me/${CHILD_USERNAME}`))
})

test('a new /clone resets a failed attempt back to pending', async () => {
    const { bot, store } = setupCloneTest({ managedTokenError: true })

    await bot.handleUpdate(privateCloneCommand('/clone'))
    await bot.handleUpdate(managedBotUpdate())
    assert.equal((await store.getAttempt('111'))?.status, 'failed')

    await bot.handleUpdate(privateCloneCommand('/clone', { updateId: 5 }))
    const attempt = await store.getAttempt('111')
    assert.equal(attempt?.status, 'pending')
    assert.equal(attempt?.botTelegramId, null)
})

test('managed_bot update without any attempt is ignored', async () => {
    const { bot, store, sent, tokenCalls } = setupCloneTest()

    await bot.handleUpdate(managedBotUpdate({ userId: 777 }))

    assert.equal(sent.length, 0)
    assert.deepEqual(tokenCalls, [])
    assert.equal(await store.findBotByTelegramId('222'), null)
})

test('managed_bot update from a different owner cannot claim the attempt', async () => {
    const { bot, store, sent, tokenCalls } = setupCloneTest()

    await bot.handleUpdate(privateCloneCommand('/clone'))
    assert.equal(sent.length, 1)
    await bot.handleUpdate(managedBotUpdate({ userId: 999 }))

    assert.equal(sent.length, 1)
    assert.deepEqual(tokenCalls, [])
    assert.equal(await store.findBotByTelegramId('222'), null)
    assert.equal((await store.getAttempt('111'))?.status, 'pending')
})

test('duplicate managed_bot delivery produces one clone and one completion', async () => {
    const { bot, store, sent, webhookCalls } = setupCloneTest()

    await bot.handleUpdate(privateCloneCommand('/clone'))
    await bot.handleUpdate(managedBotUpdate({ updateId: 2 }))
    await bot.handleUpdate(managedBotUpdate({ updateId: 2 }))

    assert.equal(store.bots.size, 1)
    assert.equal(webhookCalls.length, 1)
    assert.equal(sent.length, 2)
    assert.equal((await store.getAttempt('111'))?.status, 'completed')
})

test('token retrieval failure keeps a retryable failed attempt without a ready message', async () => {
    const { bot, store, sent, webhookCalls } = setupCloneTest({ managedTokenError: true })

    await bot.handleUpdate(privateCloneCommand('/clone'))
    await bot.handleUpdate(managedBotUpdate())

    const attempt = await store.getAttempt('111')
    assert.equal(attempt?.status, 'failed')
    assert.equal(attempt?.botTelegramId, '222')
    const record = await store.findBotByTelegramId('222')
    assert.ok(record, 'a placeholder row is kept for retry')
    assert.equal(record.connected, false, 'a bot without a usable token must not be served')
    assert.equal(record.lastUpdateId, null)
    assert.equal(webhookCalls.length, 0)
    assert.equal(sent.length, 2)
    assert.ok(sent[1].text.includes('could not connect'))
    assert.ok(!sent[1].text.includes(`https://t.me/${CHILD_USERNAME}`))
})

test('getMe mismatch fails the attempt without reporting readiness', async () => {
    const { bot, store, sent } = setupCloneTest({ childMe: { id: 333, username: 'otherbot' } })

    await bot.handleUpdate(privateCloneCommand('/clone'))
    await bot.handleUpdate(managedBotUpdate())

    assert.equal((await store.getAttempt('111'))?.status, 'failed')
    const record = await store.findBotByTelegramId('222')
    assert.ok(record)
    assert.equal(record.connected, false)
    assert.equal(sent.length, 2)
    assert.ok(sent[1].text.includes('could not connect'))
})

test('child bot creation failure fails the attempt without reporting readiness', async () => {
    const { bot, store, sent, webhookCalls } = setupCloneTest({ createChildBotResult: 'null' })

    await bot.handleUpdate(privateCloneCommand('/clone'))
    await bot.handleUpdate(managedBotUpdate())

    assert.equal((await store.getAttempt('111'))?.status, 'failed')
    assert.equal(webhookCalls.length, 0)
    assert.equal(sent.length, 2)
    assert.ok(sent[1].text.includes('could not connect'))
})

test('webhook registration failure fails the attempt without reporting readiness', async () => {
    const { bot, store, sent } = setupCloneTest({ webhookOk: false })

    await bot.handleUpdate(privateCloneCommand('/clone'))
    await bot.handleUpdate(managedBotUpdate())

    assert.equal((await store.getAttempt('111'))?.status, 'failed')
    const record = await store.findBotByTelegramId('222')
    assert.ok(record, 'bot row exists for repair')
    assert.equal(record.connected, false)
    assert.equal(record.lastUpdateId, null)
    assert.equal(sent.length, 2)
    assert.ok(sent[1].text.includes('could not connect'))
    assert.ok(!sent[1].text.includes('https://t.me/'))
})

test('storage failure fails the attempt without reporting readiness', async () => {
    const { bot, store, sent, webhookCalls } = setupCloneTest()
    store.ensureManagedBot = async () => {
        throw new Error('db unavailable')
    }

    await bot.handleUpdate(privateCloneCommand('/clone'))
    await bot.handleUpdate(managedBotUpdate())

    assert.equal((await store.getAttempt('111'))?.status, 'failed')
    assert.equal(webhookCalls.length, 0)
    assert.equal(sent.length, 2)
    assert.ok(sent[1].text.includes('could not connect'))
})

test('the same bot update retries a failed attempt', async () => {
    const setup = setupCloneTest({ managedTokenError: true })
    const { bot, store, sent } = setup

    await bot.handleUpdate(privateCloneCommand('/clone'))
    await bot.handleUpdate(managedBotUpdate({ updateId: 2 }))
    assert.equal((await store.getAttempt('111'))?.status, 'failed')

    setup.options.managedTokenError = false
    await bot.handleUpdate(managedBotUpdate({ updateId: 3 }))

    assert.equal((await store.getAttempt('111'))?.status, 'completed')
    assert.equal(sent.length, 3)
    assert.ok(sent[2].text.includes(`https://t.me/${CHILD_USERNAME}`))
})

test('a different bot update cannot retry another owner\'s failed attempt', async () => {
    const { bot, store, sent, tokenCalls } = setupCloneTest({ managedTokenError: true })

    await bot.handleUpdate(privateCloneCommand('/clone'))
    await bot.handleUpdate(managedBotUpdate({ botId: 222, updateId: 2 }))
    assert.equal((await store.getAttempt('111'))?.status, 'failed')

    await bot.handleUpdate(managedBotUpdate({ botId: 333, updateId: 3 }))

    assert.deepEqual(tokenCalls, [222])
    assert.equal(await store.findBotByTelegramId('333'), null)
    assert.equal(sent.length, 2)
    assert.equal((await store.getAttempt('111'))?.status, 'failed')
})

test('a webhook failure is retried by redelivering the same update id', async () => {
    const setup = setupCloneTest({ webhookOk: false })
    const { bot, store, sent } = setup

    await bot.handleUpdate(privateCloneCommand('/clone'))
    await bot.handleUpdate(managedBotUpdate({ updateId: 2 }))
    assert.equal((await store.getAttempt('111'))?.status, 'failed')
    assert.equal(sent.length, 2)

    setup.options.webhookOk = true
    await bot.handleUpdate(managedBotUpdate({ updateId: 2 }))

    assert.equal(store.bots.size, 1)
    const record = await store.findBotByTelegramId('222')
    assert.equal(record?.connected, true)
    assert.equal(record?.lastUpdateId, 2)
    assert.equal((await store.getAttempt('111'))?.status, 'completed')
    assert.equal(sent.length, 3)
    assert.ok(sent[2].text.includes(`https://t.me/${CHILD_USERNAME}`))
})

test('token rotation reconnects the same clone without a duplicate row', async () => {
    const { bot, store, sent, webhookCalls } = setupCloneTest()
    store.bots.set('222', connectedBot())

    await bot.handleUpdate(managedBotUpdate({ updateId: 2 }))

    assert.equal(store.bots.size, 1)
    const record = await store.findBotByTelegramId('222')
    assert.equal(record?.id, 'bot-internal-9')
    assert.equal(record?.token, CHILD_TOKEN)
    assert.equal(record?.webhookSecret, 'stable-secret')
    assert.equal(record?.owner, '111')
    assert.equal(record?.connected, true)
    assert.equal(record?.lastUpdateId, 2)
    assert.equal(webhookCalls.length, 1)
    assert.ok(webhookCalls[0].url.endsWith('/api/clones/bot-internal-9'))
    assert.equal(webhookCalls[0].secret, 'stable-secret')
    assert.equal(sent.length, 1)
    assert.ok(sent[0].text.includes(`https://t.me/${CHILD_USERNAME}`))
})

test('a rotation webhook failure is retried by redelivering the same update id', async () => {
    const setup = setupCloneTest({ webhookOk: false })
    const { bot, store, sent } = setup
    store.bots.set('222', connectedBot())

    await bot.handleUpdate(managedBotUpdate({ updateId: 2 }))
    const failed = await store.findBotByTelegramId('222')
    assert.equal(failed?.connected, false)
    assert.equal(failed?.lastUpdateId, 1, 'last successful update id is preserved for retry')
    assert.equal(sent.length, 1)

    setup.options.webhookOk = true
    await bot.handleUpdate(managedBotUpdate({ updateId: 2 }))

    const record = await store.findBotByTelegramId('222')
    assert.equal(record?.connected, true)
    assert.equal(record?.lastUpdateId, 2)
    assert.equal(record?.token, CHILD_TOKEN)
    assert.equal(store.bots.size, 1)
    assert.equal(sent.length, 2)
    assert.ok(sent[1].text.includes(`https://t.me/${CHILD_USERNAME}`))
})

test('duplicate rotation delivery is ignored', async () => {
    const { bot, store, sent, webhookCalls } = setupCloneTest()
    store.bots.set('222', connectedBot({ lastUpdateId: 2 }))

    await bot.handleUpdate(managedBotUpdate({ updateId: 2 }))

    assert.equal(webhookCalls.length, 0)
    assert.equal(sent.length, 0)
    assert.equal((await store.findBotByTelegramId('222'))?.token, 'old-token')
})

test('concurrent first deliveries register once and send one success', async () => {
    const { bot, store, sent, tokenCalls, webhookCalls } = setupCloneTest()

    await bot.handleUpdate(privateCloneCommand('/clone'))
    await Promise.all([
        bot.handleUpdate(managedBotUpdate({ updateId: 2 })),
        bot.handleUpdate(managedBotUpdate({ updateId: 2 })),
    ])

    assert.equal(store.bots.size, 1)
    assert.equal(tokenCalls.length, 1, 'only the winning delivery fetches a token')
    assert.equal(webhookCalls.length, 1, 'only one webhook registration')
    assert.equal(sent.length, 2, 'one offer and one success')
    assert.equal((await store.getAttempt('111'))?.status, 'completed')
})

test('concurrent rotation deliveries register once and send one success', async () => {
    const { bot, store, sent, webhookCalls } = setupCloneTest()
    store.bots.set('222', connectedBot())

    await Promise.all([
        bot.handleUpdate(managedBotUpdate({ updateId: 2 })),
        bot.handleUpdate(managedBotUpdate({ updateId: 2 })),
    ])

    assert.equal(store.bots.size, 1)
    assert.equal(webhookCalls.length, 1, 'only one webhook registration')
    assert.equal(sent.length, 1, 'one success reply')
    assert.equal((await store.findBotByTelegramId('222'))?.lastUpdateId, 2)
})

test('a superseded in-flight attempt cannot complete or report success', async () => {
    const setup = setupCloneTest()
    const { bot, store, sent } = setup

    await bot.handleUpdate(privateCloneCommand('/clone', { updateId: 1 }))
    const firstGeneration = (await store.getAttempt('111'))?.generation

    let releaseWebhook: () => void = () => {}
    setup.options.webhookGate = new Promise<void>((resolve) => {
        releaseWebhook = resolve
    })

    const oldDelivery = bot.handleUpdate(managedBotUpdate({ updateId: 2 }))
    await settle()
    assert.equal(webhookCallsPending(setup), true, 'old delivery should be held at webhook registration')

    setup.options.now = new Date('2026-10-01T12:05:00.000Z')
    await bot.handleUpdate(privateCloneCommand('/clone', { updateId: 3 }))
    const superseded = await store.getAttempt('111')
    assert.equal(superseded?.status, 'pending')

    releaseWebhook()
    await oldDelivery

    const after = await store.getAttempt('111')
    assert.equal(after?.status, 'pending', 'the new attempt must stay pending')
    assert.equal(after?.generation, superseded?.generation)
    assert.ok(after && firstGeneration && after.generation !== firstGeneration, 'the new attempt carries a fresh generation')
    const oldBot = await store.findBotByTelegramId('222')
    assert.ok(oldBot, 'the stale delivery created its bot row')
    assert.equal(oldBot.connected, false, 'a superseded delivery must not finalize the connection')
    assert.equal(oldBot.token, null)
    assert.equal(oldBot.lastUpdateId, null)
    assert.equal(setup.deletedWebhooks.count, 1, 'the superseded webhook must be torn down')
    assert.equal(sent.length, 2, 'only the two offers are sent; the stale success is suppressed')
    assert.ok(!JSON.stringify(sent).includes(`https://t.me/${CHILD_USERNAME}`))

    // The clone route must reject the un-finalized clone.
    const routePOST = createClonesPOST({
        findCloneRecord: async () => oldBot,
        createCloneBot: async () => {
            throw new Error('must not create a bot for a superseded clone')
        },
        dispatchUpdate: async () => {
            throw new Error('must not dispatch for a superseded clone')
        },
    })
    const routeResponse = await routePOST(
        new Request('https://bot.example.test/api/clones/222', {
            method: 'POST',
            headers: { 'X-Telegram-Bot-Api-Secret-Token': 'fixed-clone-secret' },
            body: JSON.stringify({ update_id: 9 }),
        }),
        { params: Promise.resolve({ id: '222' }) },
    )
    assert.equal(await routeResponse.text(), '{}')
})

function webhookCallsPending(setup: CloneTestSetup): boolean {
    // The gate is resolved by the test; before that no webhook call is recorded.
    return setup.webhookCalls.length === 0
}

test('duplicate concurrent rotation with a stale in-flight claim is retried after the stale window', async () => {
    const setup = setupCloneTest()
    const { bot, store } = setup
    store.bots.set('222', connectedBot({ connectingAt: new Date('2026-10-01T11:00:00.000Z') }))

    // 12:00 now, claim from 11:00 is older than the 10 minute stale window.
    await bot.handleUpdate(managedBotUpdate({ updateId: 2 }))

    assert.equal((await store.findBotByTelegramId('222'))?.connected, true)
    assert.equal(store.bots.size, 1)
})

test('owner change quarantines the clone and alerts the operator without the token', async () => {
    const { bot, store, sent, tokenCalls } = setupCloneTest()
    store.bots.set('222', connectedBot({ owner: '999' }))

    await bot.handleUpdate(managedBotUpdate({ userId: 111, updateId: 5 }))

    const record = await store.findBotByTelegramId('222')
    assert.equal(record?.owner, '999')
    assert.equal(record?.quarantined, true)
    assert.deepEqual(tokenCalls, [], 'must not fetch a token for a hijacked bot')
    const adminMessages = sent.filter((message) => String(message.chatId) === '4242')
    assert.equal(adminMessages.length, 1)
    assert.ok(adminMessages[0].text.includes('222'))
    assert.ok(!adminMessages[0].text.includes(CHILD_TOKEN))
    assert.ok(!JSON.stringify(sent).includes(CHILD_TOKEN))
    const userNotice = sent.find((message) => String(message.chatId) === '111')
    assert.ok(userNotice, 'reporting user must be notified')
})

test('updates for quarantined clones are ignored', async () => {
    const { bot, store, sent, tokenCalls } = setupCloneTest()
    store.bots.set('222', connectedBot({ quarantined: true }))

    await bot.handleUpdate(managedBotUpdate({ updateId: 5 }))

    assert.deepEqual(tokenCalls, [])
    assert.equal(sent.length, 0)
    assert.equal((await store.findBotByTelegramId('222'))?.token, 'old-token')
})

function fakeApi(setWebhook: (url: string, options?: { secret_token?: string }) => Promise<unknown>): CloneBotApi {
    return {
        getMe: async () => ({ id: 222, username: CHILD_USERNAME }),
        setWebhook,
    }
}

test('registerManagedCloneWebhook requires setWebhook to resolve true', async () => {
    assert.equal(await registerManagedCloneWebhook(fakeApi(async () => true), 'route-1', 's3cret'), true)
    assert.equal(await registerManagedCloneWebhook(fakeApi(async () => false), 'route-1', 's3cret'), false)
    assert.equal(await registerManagedCloneWebhook(fakeApi(async () => ({ ok: true })), 'route-1', 's3cret'), false)
    assert.equal(await registerManagedCloneWebhook(fakeApi(async () => undefined), 'route-1', 's3cret'), false)
    assert.equal(
        await registerManagedCloneWebhook(
            fakeApi(async () => {
                throw new Error('telegram rejected the webhook')
            }),
            'route-1',
            's3cret',
        ),
        false,
    )
})

test('an expired placeholder cannot be enrolled by a later managed_bot update', async () => {
    const setup = setupCloneTest({ webhookOk: false })
    const { bot, store, sent, tokenCalls, webhookCalls } = setup

    await bot.handleUpdate(privateCloneCommand('/clone', { updateId: 1 }))
    await bot.handleUpdate(managedBotUpdate({ updateId: 2 }))
    const failedRow = await store.findBotByTelegramId('222')
    assert.equal(failedRow?.connected, false)
    const tokensAfterFailure = tokenCalls.length
    const webhooksAfterFailure = webhookCalls.length

    // Move beyond the 15 minute window.
    setup.options.now = new Date('2026-10-01T12:20:00.000Z')
    await bot.handleUpdate(managedBotUpdate({ updateId: 2 }))
    await bot.handleUpdate(managedBotUpdate({ updateId: 3 }))

    assert.equal(tokenCalls.length, tokensAfterFailure, 'no token fetch after expiry')
    assert.equal(webhookCalls.length, webhooksAfterFailure, 'no webhook attempt after expiry')
    const row = await store.findBotByTelegramId('222')
    assert.equal(row?.connected, false)
    assert.equal(row?.lastUpdateId, null)
    assert.equal(sent.length, 2, 'only the offer and the first failure are sent')
})

test('a failed bot cannot connect under a newer superseding attempt', async () => {
    const { bot, store, sent, tokenCalls, webhookCalls } = setupCloneTest({ webhookOk: false })

    await bot.handleUpdate(privateCloneCommand('/clone', { updateId: 1 }))
    await bot.handleUpdate(managedBotUpdate({ updateId: 2, botId: 222 }))
    assert.equal((await store.getAttempt('111'))?.status, 'failed')

    // A new /clone supersedes the failed attempt: the attempt is now unbound.
    await bot.handleUpdate(privateCloneCommand('/clone', { updateId: 3 }))
    const fresh = await store.getAttempt('111')
    assert.equal(fresh?.status, 'pending')
    assert.equal(fresh?.botTelegramId, null)

    const tokensBefore = tokenCalls.length
    const webhooksBefore = webhookCalls.length
    await bot.handleUpdate(managedBotUpdate({ updateId: 4, botId: 222 }))

    assert.equal(tokenCalls.length, tokensBefore, 'the old bot must not be enrolled under the new attempt')
    assert.equal(webhookCalls.length, webhooksBefore, 'no webhook for the old bot under the new attempt')
    const row = await store.findBotByTelegramId('222')
    assert.equal(row?.connected, false)
    assert.equal((await store.getAttempt('111'))?.status, 'pending')
    assert.equal((await store.getAttempt('111'))?.generation, fresh?.generation)
    assert.equal(sent.length, 3, 'offer, failure, then the superseding offer')
})

test('registerManagedCloneWebhook uses the opaque route id and per-clone secret only', async () => {
    const calls: Array<{ url: string; secret?: string }> = []
    const ok = await registerManagedCloneWebhook(
        fakeApi(async (url, options) => {
            calls.push({ url, secret: options?.secret_token })
            return true
        }),
        'bot-internal-42',
        'per-clone-secret',
    )

    assert.equal(ok, true)
    assert.equal(calls.length, 1)
    assert.ok(calls[0].url.endsWith('/api/clones/bot-internal-42'), `unexpected webhook URL: ${calls[0].url}`)
    assert.ok(!calls[0].url.includes('?'), 'managed webhook URL must carry no query string')
    assert.ok(!calls[0].url.includes(CHILD_TOKEN))
    assert.ok(!calls[0].url.includes('per-clone-secret'))
    assert.equal(calls[0].secret, 'per-clone-secret')
})
