import { Composer, InputFile } from 'grammy'
import { getCachedMessages } from '../middleware/messageCache'
import { clampCount, selectMessages } from '../quote/selection'
import { toCachedMessage } from '../quote/message'
import { getAvatar } from '../quote/avatar'
import { fetchMediaDataUrl } from '../quote/media'
import { renderQuote, type QuoteEntry } from '../quote/render'
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

    const count = clampCount(parseInt(ctx.match.trim(), 10) || 1)

    let messages: CachedMessage[] = []
    if (count > 1 && ctx.chat) {
        messages = selectMessages(await getCachedMessages(ctx.chat.id), reply.message_id, count)
    }
    if (messages.length === 0) {
        messages = [toCachedMessage(reply)]
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
        console.error('[quote] failed to build quote sticker', error)
        await ctx
            .reply(ctx.t('Could not create the quote sticker.') as string, {
                reply_parameters: { message_id: message.message_id },
            })
            .catch(() => {})
    }
})

export default quote
