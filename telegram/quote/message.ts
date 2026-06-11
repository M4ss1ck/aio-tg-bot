import type { Message, User } from 'grammy/types'
import type { CachedMessage, QuoteMedia, QuoteReply, QuoteUser } from './types'

export const NAME_COLOR_COUNT = 7

/** Stable Telegram-style name color index derived from a user/peer id. */
export function colorId(id: number): number {
    return Math.abs(id) % NAME_COLOR_COUNT
}

export function displayName(user?: User): string {
    if (!user) return 'Unknown'
    const full = [user.first_name, user.last_name].filter(Boolean).join(' ')
    return full || user.username || 'Unknown'
}

function toUser(user?: User): QuoteUser {
    return {
        id: user?.id ?? 0,
        name: displayName(user),
        username: user?.username,
    }
}

function pickText(msg: Pick<Message, 'text' | 'caption'> & Partial<Message>): string | undefined {
    if (typeof msg.text === 'string' && msg.text) return msg.text
    if (typeof msg.caption === 'string' && msg.caption) return msg.caption
    return undefined
}

function extractMedia(msg: Message): QuoteMedia | undefined {
    if ('photo' in msg && msg.photo?.length) {
        const largest = msg.photo[msg.photo.length - 1]
        return { type: 'photo', fileId: largest.file_id, width: largest.width, height: largest.height }
    }
    // Animated (.tgs) and video (.webm) stickers can't be inlined; skip them.
    if ('sticker' in msg && msg.sticker && !msg.sticker.is_animated && !msg.sticker.is_video) {
        const s = msg.sticker
        return { type: 'sticker', fileId: s.file_id, width: s.width, height: s.height }
    }
    return undefined
}

function extractReply(msg: Message): QuoteReply | undefined {
    const r = msg.reply_to_message
    if (!r) return undefined
    const from = 'from' in r ? r.from : undefined
    const text = pickText(r)
        ?? ('sticker' in r && r.sticker?.emoji ? `${r.sticker.emoji} Sticker` : undefined)
        ?? ('photo' in r ? 'Photo' : undefined)
        ?? 'Message'
    return { name: displayName(from), text, colorId: colorId(from?.id ?? 0) }
}

/** Convert a grammY message into the compact cached form used for rendering. */
export function toCachedMessage(msg: Message): CachedMessage {
    const from = 'from' in msg ? msg.from : undefined
    return {
        message_id: msg.message_id,
        date: msg.date,
        from: toUser(from),
        colorId: colorId(from?.id ?? 0),
        text: pickText(msg),
        media: extractMedia(msg),
        reply: extractReply(msg),
    }
}

/** Whether a message carries content worth caching for later quoting. */
export function isCacheable(msg: Message): boolean {
    if ('text' in msg && msg.text?.startsWith('/')) return false
    return Boolean(
        pickText(msg)
        || ('photo' in msg && msg.photo)
        || ('sticker' in msg && msg.sticker),
    )
}
