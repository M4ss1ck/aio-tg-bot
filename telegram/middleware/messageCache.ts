import { Composer } from 'grammy'
import { getRedisClient } from '../session/redis'
import { isCacheable, toCachedMessage } from '../quote/message'
import { logger } from '../../utils/logger'
import type { CachedMessage } from '../quote/types'
import type { MyContext } from '../types'

const MAX_CACHED = 50
const TTL_SECONDS = 60 * 60 * 24 // 24h

const cacheKey = (chatId: number) => `quote:msgs:${chatId}`

const messageCache = new Composer<MyContext>()

// Record every content-bearing message so /quote can later include recent ones.
messageCache.on('message', async (ctx, next) => {
    try {
        const client = getRedisClient()
        if (!client) {
            logger.debug('[quote] messageCache skipped: no Redis client (REDIS_URL unset)')
        } else if (ctx.chat && ctx.message && isCacheable(ctx.message)) {
            const key = cacheKey(ctx.chat.id)
            await client.lpush(key, JSON.stringify(toCachedMessage(ctx.message)))
            await client.ltrim(key, 0, MAX_CACHED - 1)
            await client.expire(key, TTL_SECONDS)
            const len = await client.llen(key)
            logger.debug(`[quote] cached message ${ctx.message.message_id} in chat ${ctx.chat.id} (cache size ${len})`)
        }
    } catch (error) {
        logger.error('[quote] messageCache error', error)
    }
    return next()
})

/** Read the cached messages for a chat (newest first as stored). */
export async function getCachedMessages(chatId: number): Promise<CachedMessage[]> {
    const client = getRedisClient()
    if (!client) {
        logger.warn('[quote] getCachedMessages: no Redis client (REDIS_URL unset); multi-message quotes unavailable')
        return []
    }
    try {
        const raw = await client.lrange(cacheKey(chatId), 0, -1)
        return raw.map(r => JSON.parse(r) as CachedMessage)
    } catch (error) {
        logger.error('[quote] getCachedMessages error', error)
        return []
    }
}

export default messageCache
