import { Composer, InputFile } from 'grammy'
import { getCachedMessages } from '../middleware/messageCache'
import { clampCount, selectMessages } from '../quote/selection'
import { toCachedMessage } from '../quote/message'
import { getAvatar } from '../quote/avatar'
import { fetchMediaDataUrl } from '../quote/media'
import { renderQuote, type QuoteEntry } from '../quote/render'
import { logger } from '../../utils/logger'
import type { CachedMessage } from '../quote/types'
import type { MyContext } from '../types'

const quote = new Composer<MyContext>()

quote.command(['quote', 'q'], async (ctx) => {
    const message = ctx.message
    const reply = message?.reply_to_message
    if (!message) return

    if (!reply) {
        await ctx
            .reply(ctx.t('Reply to a message to turn it into a quote sticker.') as string, {
                reply_parameters: { message_id: message.message_id },
            })
            .catch(() => {})
        return
    }

    const requested = clampCount(parseInt(ctx.match.trim(), 10) || 1)
    const repliedId = reply.message_id
    // The replied message is always available from the update itself; use it as
    // the fallback and as a selection anchor when the cache lacks it.
    const anchor = toCachedMessage(reply)

    let messages: CachedMessage[] = [anchor]
    let cachedCount = 0
    if (requested > 1 && ctx.chat) {
        const cached = await getCachedMessages(ctx.chat.id)
        cachedCount = cached.length
        const pool = cached.some(m => m.message_id === repliedId) ? cached : [...cached, anchor]
        const selected = selectMessages(pool, repliedId, requested)
        if (selected.length > 0) messages = selected
    }

    logger.info(
        `[quote] chat=${ctx.chat?.id} user=${ctx.from?.id} requested=${requested} `
        + `repliedId=${repliedId} cached=${cachedCount} selected=${messages.length} `
        + `ids=[${messages.map(m => m.message_id).join(',')}]`,
    )
    if (requested > 1 && cachedCount === 0) {
        logger.warn(
            '[quote] no cached messages for this chat, so only the replied message can be quoted. '
            + 'In groups the bot needs privacy mode disabled (or admin rights) to see normal messages.',
        )
    }

    try {
        await ctx.replyWithChatAction('choose_sticker').catch(() => {})

        // Dedupe avatar fetches per author (grouped messages share a sender) and
        // resolve all avatars/media in parallel so latency doesn't scale with N.
        const avatars = new Map<number, ReturnType<typeof getAvatar>>()
        const avatarFor = (user: { id: number; name: string }) => {
            let pending = avatars.get(user.id)
            if (!pending) {
                pending = getAvatar(ctx, user)
                avatars.set(user.id, pending)
            }
            return pending
        }

        const entries: QuoteEntry[] = await Promise.all(messages.map(async (m) => {
            const [avatar, media] = await Promise.all([
                avatarFor(m.from),
                m.media ? fetchMediaDataUrl(ctx, m.media.fileId, m.media.width, m.media.height) : undefined,
            ])
            return {
                userId: m.from.id,
                name: m.from.name,
                colorId: m.colorId,
                avatar,
                text: m.text,
                media,
                reply: m.reply,
            }
        }))

        const webp = await renderQuote(entries)
        await ctx.replyWithSticker(new InputFile(webp), {
            reply_parameters: { message_id: message.message_id },
        })
    } catch (error) {
        logger.error('[quote] failed to build quote sticker', error)
        await ctx
            .reply(ctx.t('Could not create the quote sticker.') as string, {
                reply_parameters: { message_id: message.message_id },
            })
            .catch(() => {})
    }
})

export default quote
