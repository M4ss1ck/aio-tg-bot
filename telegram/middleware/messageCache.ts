import { Composer } from 'grammy'
import { getRedisClient } from '../session/redis'
import { isCacheable, toCachedMessage } from '../quote/message'
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
        if (client && ctx.chat && ctx.message && isCacheable(ctx.message)) {
            const key = cacheKey(ctx.chat.id)
            await client.lpush(key, JSON.stringify(toCachedMessage(ctx.message)))
            await client.ltrim(key, 0, MAX_CACHED - 1)
            await client.expire(key, TTL_SECONDS)
        }
    } catch (error) {
        console.error('[quote] messageCache error', error)
    }
    return next()
})

/** Read the cached messages for a chat (newest first as stored). */
export async function getCachedMessages(chatId: number): Promise<CachedMessage[]> {
    const client = getRedisClient()
    if (!client) return []
    try {
        const raw = await client.lrange(cacheKey(chatId), 0, -1)
        return raw.map(r => JSON.parse(r) as CachedMessage)
    } catch (error) {
        console.error('[quote] getCachedMessages error', error)
        return []
    }
}

export default messageCache
