export interface QuoteUser {
    id: number
    name: string
    username?: string
}

export interface QuoteMedia {
    type: 'photo' | 'sticker'
    fileId: string
    width?: number
    height?: number
}

export interface QuoteReply {
    name: string
    text: string
    colorId: number
}

/** Compact representation of a chat message, stored in the Redis rolling cache. */
export interface CachedMessage {
    message_id: number
    date: number
    from: QuoteUser
    colorId: number
    text?: string
    media?: QuoteMedia
    reply?: QuoteReply
}
