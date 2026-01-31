import { run } from '@grammyjs/runner'
import { bot } from '../bot'
import { logger } from '../../utils/logger'
import { closeRedis } from '../session/redis'

async function startPolling() {
    // Delete any existing webhook
    await bot.api.deleteWebhook().catch(logger.error)
    logger.info('Webhook deleted, starting polling mode...')

    // Get bot info
    const me = await bot.api.getMe()
    logger.info(`Bot @${me.username} started in polling mode`)

    // Use runner for concurrent update handling
    const runner = run(bot, {
        runner: {
            fetch: {
                allowed_updates: [
                    'message',
                    'edited_message',
                    'callback_query',
                    'inline_query',
                    'chosen_inline_result',
                    'poll_answer',
                ],
            },
        },
    })

    // Graceful shutdown
    const shutdown = async () => {
        logger.info('Shutting down...')
        if (runner.isRunning()) {
            await runner.stop()
        }
        await closeRedis()
        logger.info('Bot stopped gracefully')
        process.exit(0)
    }

    process.once('SIGINT', shutdown)
    process.once('SIGTERM', shutdown)
}

startPolling().catch((err) => {
    logger.error('Failed to start polling:', err)
    process.exit(1)
})
