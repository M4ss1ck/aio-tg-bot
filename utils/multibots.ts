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
        const url = `https://api.telegram.org/bot${token}/setWebhook?url=https://${parsedDomain}/api/token/${token}&drop_pending_updates=True`
        logger.info('WH url: ', url)
        const webhook = await axios(url)
        logger.success(webhook.data)
        return !!webhook.data.ok
    } catch (error) {
        logger.error('Error in setWH')
        logger.error(error)
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
            const { bot } = await import('../telegram/bot')
            return bot
        } else {
            const botInDB = await prisma.bot.findUnique({
                where: {
                    id: id
                }
            })
            return botInDB ? await createBot(botInDB.token) : null
        }
    } catch (error) {
        logger.error(error)
        return null
    }
}
