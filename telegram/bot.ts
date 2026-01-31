import { Bot, session } from 'grammy'
import { hydrate } from '@grammyjs/hydrate'
import { hydrateReply, parseMode } from '@grammyjs/parse-mode'
import { autoRetry } from '@grammyjs/auto-retry'
import { Agent } from 'https'
import start from './middleware/start'
import clone from './middleware/clone'
import { localDB } from '../db/local'
import { logger } from '../utils/logger'
import { token } from '../config/constants'
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
import afk from './commands/afk'
import stickers from './commands/stickers'
import gallery from './commands/gallery'
import ai from './commands/ai'
import { getUsers } from './global/data'
import type { MyContext, SessionData } from './types'
import { getRedisStorage } from './session/redis'

// set global state
global.USUARIOS = await getUsers()

// Force IPv4 to avoid IPv6 connection issues
const ipv4Agent = new Agent({ family: 4 })

export const bot = new Bot<MyContext>(token, {
  client: {
    timeoutSeconds: 30,
    baseFetchConfig: {
      agent: ipv4Agent,
    },
  }
})

localDB.set('currentToken', token)

// Install plugins
bot.use(hydrate())
bot.api.config.use(parseMode('HTML'))
bot.api.config.use(autoRetry({
  maxRetryAttempts: 3,
  maxDelaySeconds: 5,
}))

// Session middleware with Redis storage
bot.use(session({
  initial: (): SessionData => ({ lang: 'en' }),
  storage: getRedisStorage(),
  getSessionKey: (ctx) => ctx.from?.id?.toString(),
}))

// i18n must come early - before any middleware that uses ctx.t
bot.use(i18n)

// Middleware chain
bot
  .use(start)
  .use(clone)
  .use(createUser)
  .use(loggerMiddleware)
  .use(admin)
  .use(afk)
  .use(ban)
  .use(actions)
  .use(commands)
  .use(reputation)
  .use(gallery)
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
