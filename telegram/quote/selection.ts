import type { CachedMessage } from './types'

export const MAX_QUOTE_MESSAGES = 5

/** Clamp the user-supplied count to a sane [1, MAX] range. */
export function clampCount(n: number): number {
    if (!Number.isFinite(n) || n < 1) return 1
    return Math.min(Math.floor(n), MAX_QUOTE_MESSAGES)
}

/**
 * Return the replied-to message together with up to `count - 1` messages that
 * came immediately before it, in chronological order. The replied message is
 * always the most recent one in the result. Fewer messages are returned when
 * there aren't enough earlier ones. Returns an empty array when the replied
 * message is not in the cache.
 */
export function selectMessages(cached: CachedMessage[], repliedId: number, count: number): CachedMessage[] {
    const sorted = [...cached].sort((a, b) => a.message_id - b.message_id)
    const index = sorted.findIndex(m => m.message_id === repliedId)
    if (index === -1) return []

    const start = Math.max(0, index - (clampCount(count) - 1))
    return sorted.slice(start, index + 1)
}
