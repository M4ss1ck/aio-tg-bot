import { RedisAdapter } from '@grammyjs/storage-redis'
import Redis from 'ioredis'
import type { SessionData } from '../types'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

let redis: Redis | null = null
let redisStorage: RedisAdapter<SessionData> | null = null

function connect(): Redis | null {
    if (!process.env.REDIS_URL) {
        return null
    }

    if (!redis) {
        redis = new Redis(redisUrl)
        redis.on('error', (err) => {
            console.error('[redis] Connection error:', err.message)
        })
        redis.on('connect', () => {
            console.log('[redis] Connected to Redis')
        })
    }

    return redis
}

/** Raw ioredis client, sharing the connection used by the session storage. */
export function getRedisClient(): Redis | null {
    return connect()
}

export function getRedisStorage(): RedisAdapter<SessionData> | undefined {
    if (!process.env.REDIS_URL) {
        console.log('[session] No REDIS_URL set, using in-memory storage')
        return undefined
    }

    const instance = connect()!

    if (!redisStorage) {
        redisStorage = new RedisAdapter<SessionData>({
            instance,
            ttl: 60 * 60 * 24 * 30, // 30 days
        })
    }

    return redisStorage
}

export async function closeRedis(): Promise<void> {
    if (redis) {
        await redis.quit()
        redis = null
        redisStorage = null
    }
}
