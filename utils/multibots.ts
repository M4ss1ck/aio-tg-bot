import { Bot, session } from 'grammy'
import { hydrate } from '@grammyjs/hydrate'
import { parseMode } from '@grammyjs/parse-mode'
import { autoRetry } from '@grammyjs/auto-retry'
import axios from 'axios'
import { logger } from './logger'
import { prisma } from '../db/prisma'
import { localDB } from '../db/local'
import { tgAPI } from '../config/constants'
import start from '../telegram/middleware/start'
import actions from '../telegram/actions/index'
import commands from '../telegram/commands/index'
import reputation from '../telegram/commands/reputation'
import filtros from '../telegram/commands/filtros'
import urban from '../telegram/commands/ud'
import love from '../telegram/commands/love'
import inline from '../telegram/inline/inline'
import replacer from '../telegram/commands/replace'
import polls from '../telegram/commands/polls'
import admin from '../telegram/commands/admin'
import createUser from '../telegram/commands/createUser'
import loggerMiddleware from '../telegram/middleware/commandLogger'
import ban from '../telegram/commands/ban'
import qr from '../telegram/commands/qr'
import quote from '../telegram/commands/quote'
import messageCache from '../telegram/middleware/messageCache'
import i18n from '../telegram/middleware/i18n'
import stickers from '../telegram/commands/stickers'
import gallery from '../telegram/commands/gallery'
import ai from '../telegram/commands/ai'
import { getRedisStorage } from '../telegram/session/redis'
import type { MyContext, SessionData } from '../telegram/types'

const domain = process.env.NEXT_PUBLIC_DOMAIN!

export const setWH = async (token: string) => {
    try {
        const parsedDomain = domain.replace(/^http(s)?:\/\//, '')
        const botPrefix = token.split(':')[0]
        const url = `https://api.telegram.org/bot${token}/setWebhook?url=https://${parsedDomain}/api/token/${token}&drop_pending_updates=True`
        logger.info(`Setting webhook for bot ${botPrefix}`)
        const webhook = await axios(url)
        logger.success(`Webhook response ok=${webhook.data?.ok ?? 'unknown'} for bot ${botPrefix}`)
        return !!webhook.data.ok
    } catch {
        logger.error('Error in setWH')
        return false
    }
}

export const createBot = async (token: string) => {
    logger.info('calling createBot')
    try {
        logger.info('starting new bot')
        const bot = new Bot<MyContext>(token, {
            client: {
                apiRoot: tgAPI,
                timeoutSeconds: 30,
            },
        })

        bot.use(hydrate())
        bot.api.config.use(parseMode('HTML'))
        bot.api.config.use(autoRetry({
            maxRetryAttempts: 3,
            maxDelaySeconds: 5,
        }))

        // Sessions are namespaced per-bot so cloned bots don't share user state.
        const tokenPrefix = token.split(':')[0]
        bot.use(session({
            initial: (): SessionData => ({ lang: 'en' }),
            storage: getRedisStorage(),
            getSessionKey: (ctx) => ctx.from ? `${tokenPrefix}:${ctx.from.id}` : undefined,
        }))

        bot
            .use(i18n)
            .use(start)
            .use(createUser)
            .use(loggerMiddleware)
            .use(messageCache)
            .use(admin)
            .use(ban)
            .use(actions)
            .use(commands)
            .use(gallery)
            .use(reputation)
            .use(urban)
            .use(love)
            .use(inline)
            .use(replacer)
            .use(polls)
            .use(qr)
            .use(quote)
            .use(ai)
            .use(stickers)
            .use(filtros)

        bot.catch((err) => {
            logger.error('Bot general error!')
            logger.error(err)
        })

        localDB.set('currentToken', token)
        return bot
    } catch (error) {
        logger.error(error)
        return null
    }
}

export const loadBot = async (id: string) => {
    try {
        if (id === 'default') {
            const { getBot } = await import('../telegram/bot')
            return getBot()
        } else {
            const botInDB = await prisma.bot.findUnique({
                where: {
                    id: id
                }
            })
            return botInDB?.token ? await createBot(botInDB.token) : null
        }
    } catch (error) {
        logger.error(error)
        return null
    }
}

export interface CloneBotApi {
    getMe(): Promise<{ id: number; username?: string }>
    setWebhook(url: string, options?: { secret_token?: string; drop_pending_updates?: boolean }): Promise<unknown>
    deleteWebhook?(): Promise<unknown>
}

export const buildManagedCloneWebhookUrl = (routeId: string) => {
    const host = String(domain ?? '').replace(/^https?:\/\//i, '').replace(/\/$/, '')
    return `https://${host}/api/clones/${routeId}`
}

export const registerManagedCloneWebhook = async (
    api: CloneBotApi,
    routeId: string,
    secret: string,
): Promise<boolean> => {
    try {
        const result = await api.setWebhook(buildManagedCloneWebhookUrl(routeId), {
            secret_token: secret,
            drop_pending_updates: false,
        })
        if (result !== true) {
            logger.error('Managed clone webhook registration was not accepted')
            return false
        }
        logger.success('Managed clone webhook registered')
        return true
    } catch {
        logger.error('Failed to register managed clone webhook')
        return false
    }
}
