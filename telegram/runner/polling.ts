import { API_CONSTANTS } from 'grammy'
import { getBot, loadUsers } from '../bot'
import { logger } from '../../utils/logger'
import { closeRedis } from '../session/redis'

const bot = getBot()

async function shutdown(code = 0) {
    logger.info('Shutting down...')
    await bot.stop()
    await closeRedis()
    logger.info('Bot stopped gracefully')
    process.exit(code)
}

process.once('SIGINT', () => shutdown(0))
process.once('SIGTERM', () => shutdown(0))

await loadUsers()
await bot.api.deleteWebhook({ drop_pending_updates: false })

await bot.start({
    allowed_updates: API_CONSTANTS.ALL_UPDATE_TYPES,
    onStart: (me) => logger.info(`Bot @${me.username} started in polling mode`),
})
