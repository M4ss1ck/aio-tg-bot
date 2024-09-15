import { Telegraf, session } from 'telegraf'
import start from './middleware/start'
import clone from './middleware/clone'
import { localDB } from '../db/local'
import { logger } from '../utils/logger'
import { token, domain } from '../config/constants'
import actions from './actions/index'
import commands from './commands/index'
import reputation from './commands/reputation'
import filtros from './commands/filtros'
import urban from './commands/ud'
import love from './commands/love'
import inline from './inline/inline'
import replacer from './commands/replace'
import polls from './commands/polls'
import admin from './commands/admin'
import createUser from './commands/createUser'
import loggerMiddleware from './middleware/commandLogger'
import ban from './commands/ban'
import qr from './commands/qr'
import i18n from './middleware/i18n'
import stickers from './commands/stickers'
import { getUsers } from './global/data'
import type { MyContext } from './interfaces'

// set global state
global.USUARIOS = await getUsers()

export const bot = new Telegraf<MyContext>(token)

localDB.set('currentToken', 'default')

bot
    .use(session())
    .use(start)
    .use(clone)
    .use(createUser)
    .use(loggerMiddleware)
    .use(i18n)
    .use(admin)
    .use(ban)
    .use(actions)
    .use(commands)
    .use(reputation)
    .use(urban)
    .use(love)
    .use(inline)
    .use(replacer)
    .use(polls)
    .use(qr)
    .use(stickers)
    .use(filtros)

bot.launch({
    webhook: {
        domain: domain,
        hookPath: '/api/bot'
    },
    dropPendingUpdates: true
}).catch(e => {
    logger.error('Bot stopped working')
    logger.error(e)
})
logger.info('Bot started!')

bot.catch(e => {
    logger.error('Bot general error!')
    logger.error(e)
})