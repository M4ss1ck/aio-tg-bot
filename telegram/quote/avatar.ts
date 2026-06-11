import sharp from 'sharp'
import { getRedisClient } from '../session/redis'
import { tgAPI } from '../../config/constants'
import type { MyContext } from '../types'

const TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

// Telegram-style gradient pairs for initial-based fallback avatars.
const GRADIENTS: [string, string][] = [
    ['#ff885e', '#ff516a'],
    ['#ffcd6a', '#ffa85c'],
    ['#82b1ff', '#665fff'],
    ['#a0de7e', '#54cb68'],
    ['#53edd6', '#28c9b7'],
    ['#72d5fd', '#2a9ef1'],
    ['#e0a2f3', '#d669ed'],
]

export interface Avatar {
    dataUrl?: string
    gradient: [string, string]
    initial: string
}

function fallback(user: { id: number; name: string }): Pick<Avatar, 'gradient' | 'initial'> {
    return {
        gradient: GRADIENTS[Math.abs(user.id) % GRADIENTS.length],
        initial: (user.name.trim()[0] || '?').toUpperCase(),
    }
}

/**
 * Resolve a user's avatar: their real profile photo (circular PNG data URL) when
 * available, otherwise a gradient + initial fallback. Results are cached in Redis.
 */
export async function getAvatar(ctx: MyContext, user: { id: number; name: string }): Promise<Avatar> {
    const base = fallback(user)
    const client = getRedisClient()
    const key = `quote:avatar:${user.id}`

    try {
        if (client) {
            const cached = await client.get(key)
            if (cached !== null) {
                return { ...base, dataUrl: cached === 'none' ? undefined : cached }
            }
        }

        const photos = await ctx.api.getUserProfilePhotos(user.id, { limit: 1 })
        const sizes = photos.total_count > 0 ? photos.photos[0] : undefined
        const photo = sizes?.[sizes.length - 1]

        if (!photo) {
            if (client) await client.set(key, 'none', 'EX', TTL_SECONDS)
            return base
        }

        const file = await ctx.api.getFile(photo.file_id)
        const link = `${tgAPI}/file/bot${ctx.api.token}/${file.file_path}`
        const res = await fetch(link)
        const input = Buffer.from(await res.arrayBuffer())
        const png = await sharp(input).resize(160, 160, { fit: 'cover' }).png().toBuffer()
        const dataUrl = `data:image/png;base64,${png.toString('base64')}`

        if (client) await client.set(key, dataUrl, 'EX', TTL_SECONDS)
        return { ...base, dataUrl }
    } catch (error) {
        console.error('[quote] getAvatar error', error)
        return base
    }
}
