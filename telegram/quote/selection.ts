import type { CachedMessage } from './types'

export const MAX_QUOTE_MESSAGES = 5

/** Clamp the user-supplied count to a sane [1, MAX] range. */
export function clampCount(n: number): number {
    if (!Number.isFinite(n) || n < 1) return 1
    return Math.min(Math.floor(n), MAX_QUOTE_MESSAGES)
}

/**
 * From the cached messages, return up to `count` consecutive messages starting
 * at the replied-to message and moving forward (towards newer messages).
 * Returns an empty array when the replied message is not in the cache.
 */
export function selectMessages(cached: CachedMessage[], repliedId: number, count: number): CachedMessage[] {
    const sorted = [...cached].sort((a, b) => a.message_id - b.message_id)
    const start = sorted.findIndex(m => m.message_id === repliedId)
    if (start === -1) return []
    return sorted.slice(start, start + clampCount(count))
}
