import { run } from '@grammyjs/runner'
import { bot } from '../bot'
import { logger } from '../../utils/logger'
import { closeRedis } from '../session/redis'

let runner: ReturnType<typeof run> | null = null

async function shutdown(code = 0) {
    logger.info('Shutting down...')
    if (runner?.isRunning()) {
        await runner.stop()
    }
    await closeRedis()
    logger.info('Bot stopped gracefully')
    process.exit(code)
}

async function startPolling() {
    // Delete any existing webhook
    try {
        await bot.api.deleteWebhook({ drop_pending_updates: false })
    } catch (err) {
        logger.error('Failed to delete webhook:', err)
        // Continue anyway - might work
    }

    logger.info('Webhook deleted, starting polling mode...')

    // Get bot info with fail-fast
    const me = await bot.api.getMe()
    logger.info(`Bot @${me.username} started in polling mode`)

    // Use runner for concurrent update handling
    runner = run(bot, {
        runner: {
            fetch: {
                // Must be less than HTTP client timeout (10s)
                timeout: 8,
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

    process.once('SIGINT', () => shutdown(0))
    process.once('SIGTERM', () => shutdown(0))
}

startPolling().catch((err) => {
    logger.error('Failed to start polling:', err)
    process.exit(1)
})
