import { Telegraf, session } from "telegraf";
import axios from "axios";
import { logger } from "./logger";
import { prisma } from "../db/prisma";
import { localDB } from "../db/local";
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
import gallery from "../telegram/commands/gallery";
import ai from "../telegram/commands/ai";
import type { MyContext } from '../telegram/interfaces'

const domain = process.env.NEXT_PUBLIC_DOMAIN!;

export const setWH = async (token: string) => {
    try {
        const url = `https://api.telegram.org/bot${token}/setWebhook?url=https://${domain}/api/token/${token}`
        logger.info('WH url: ', url)
        const webhook = await axios(url);
        logger.success(webhook.data);
        return !!webhook.data.ok
    } catch (error) {
        logger.error('Error in setWH')
        logger.error(error);
        return false
    }
}

export const createBot = async (token: string) => {
    logger.info('calling createBot')
    try {
        logger.info('starting new bot')
        const bot = new Telegraf<MyContext>(token)
        bot
            .use(session())
            .use(start)
            .use(createUser)
            .use(loggerMiddleware)
            .use(i18n)
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

        bot.launch({
            webhook: {
                domain: process.env.NEXT_PUBLIC_DOMAIN!,
                hookPath: `/api/token/${token}`
            },
            dropPendingUpdates: true
        }).catch(e => {
            logger.error('Bot stopped working')
            logger.error(e)
        })

        bot.catch(e => {
            logger.error('Bot general error!')
            logger.error(e)
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