import { Composer } from 'grammy'
import type { MessageEntity } from 'grammy/types'
import { prisma } from '../../db/prisma'
import type { MyContext } from '../types'

const filtros = new Composer<MyContext>()

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

function escapeAttr(value: string): string {
    return escapeHtml(value).replace(/"/g, '&quot;')
}

type EntityTags = { open: string; close: string } | null

function tagsFor(entity: MessageEntity): EntityTags {
    switch (entity.type) {
        case 'bold': return { open: '<b>', close: '</b>' }
        case 'italic': return { open: '<i>', close: '</i>' }
        case 'underline': return { open: '<u>', close: '</u>' }
        case 'strikethrough': return { open: '<s>', close: '</s>' }
        case 'spoiler': return { open: '<tg-spoiler>', close: '</tg-spoiler>' }
        case 'code': return { open: '<code>', close: '</code>' }
        case 'pre': {
            const lang = (entity as MessageEntity.PreMessageEntity).language
            return lang
                ? { open: `<pre><code class="language-${escapeAttr(lang)}">`, close: '</code></pre>' }
                : { open: '<pre>', close: '</pre>' }
        }
        case 'text_link': {
            const url = (entity as MessageEntity.TextLinkMessageEntity).url
            return { open: `<a href="${escapeAttr(url)}">`, close: '</a>' }
        }
        case 'text_mention': {
            const user = (entity as MessageEntity.TextMentionMessageEntity).user
            return { open: `<a href="tg://user?id=${user.id}">`, close: '</a>' }
        }
        case 'blockquote': return { open: '<blockquote>', close: '</blockquote>' }
        case 'expandable_blockquote': return { open: '<blockquote expandable>', close: '</blockquote>' }
        case 'custom_emoji': {
            const id = (entity as MessageEntity.CustomEmojiMessageEntity).custom_emoji_id
            return { open: `<tg-emoji emoji-id="${escapeAttr(id)}">`, close: '</tg-emoji>' }
        }
        default:
            return null
    }
}

// Walk text in UTF-16 code units (Telegram entity offsets), wrap entity ranges with HTML tags.
function entitiesToHtml(text: string, entities?: MessageEntity[]): string {
    if (!entities?.length) return escapeHtml(text)

    type Marker = { pos: number; tag: string; open: boolean; prio: number }
    const markers: Marker[] = []
    entities.forEach((entity, prio) => {
        const tags = tagsFor(entity)
        if (!tags) return
        markers.push({ pos: entity.offset, tag: tags.open, open: true, prio })
        markers.push({ pos: entity.offset + entity.length, tag: tags.close, open: false, prio })
    })

    // At the same position: closes first (later entities close first), then opens (earlier entities open first).
    markers.sort((a, b) => {
        if (a.pos !== b.pos) return a.pos - b.pos
        if (a.open !== b.open) return a.open ? 1 : -1
        return a.open ? a.prio - b.prio : b.prio - a.prio
    })

    let out = ''
    let cursor = 0
    for (const m of markers) {
        if (m.pos > cursor) {
            out += escapeHtml(text.slice(cursor, m.pos))
            cursor = m.pos
        }
        out += m.tag
    }
    if (cursor < text.length) out += escapeHtml(text.slice(cursor))
    return out
}

filtros.command('add', async (ctx) => {
    const chatId = ctx.chat?.id.toString() ?? ''
    if (ctx.message?.reply_to_message && ctx.message.text && ctx.message.text.length > 4) {
        const trigger = ctx.message.text.replace('/add ', '')

        if (trigger.length > 0) {
            const answer = JSON.stringify(ctx.message.reply_to_message)
            let type
            if ('text' in ctx.message.reply_to_message)
                type = 'text'
            else if ('photo' in ctx.message.reply_to_message)
                type = 'photo'
            else if ('voice' in ctx.message.reply_to_message)
                type = 'voice'
            else if ('video' in ctx.message.reply_to_message)
                type = 'video'
            else if ('sticker' in ctx.message.reply_to_message)
                type = 'sticker'
            else if ('audio' in ctx.message.reply_to_message)
                type = 'audio'
            else
                type = 'document'

            await prisma.filter.upsert({
                where: {
                    filter_chat: {
                        filter: trigger,
                        chat: chatId,
                    },
                },
                create: {
                    filter: trigger,
                    chat: chatId,
                    tipo: type,
                    respuesta: answer,
                },
                update: {
                    tipo: type,
                    respuesta: answer,
                },
            })

            await ctx.reply(ctx.t('Filter added', { trigger })!)
        }
        else {
            await ctx.reply(ctx.t('Debe escribir un filtro')!)
        }
    }
})

filtros.command('rem', async (ctx) => {
    const chatId = ctx.chat?.id.toString() ?? ''
    const trigger = ctx.message?.text?.replace('/rem ', '') ?? ''
    await prisma.filter
        .delete({
            where: {
                filter_chat: {
                    filter: trigger,
                    chat: chatId,
                },
            },
        })
        .then(() =>
            ctx.reply(ctx.t('Filter eliminated', { trigger }) as string),
        )
        .catch(() =>
            ctx.reply(ctx.t('Filter doesn\'t exist', { trigger }) as string),
        )
})

filtros.command(['filters', 'filtros'], async (ctx) => {
    const chatId = ctx.chat?.id.toString() ?? ''
    const filters = await prisma.filter.findMany({
        where: {
            chat: chatId,
        },
        select: {
            filter: true,
        },
    })
    const filtrosTexto
        = filters.length > 0
            ? `<code>${filters.map(f => f.filter).join('</code>\n<code>')}</code>`
            : ctx.t('<i>No se encontraron filtros</i>')

    await ctx.reply(`<b>${ctx.t('Lista de filtros:')}</b>\n${filtrosTexto}`)
})

filtros.on(['message:text', 'message:caption'], async (ctx) => {
    const chatId = ctx.chat?.id.toString() ?? 'global'
    const filters = await prisma.filter.findMany({
        where: {
            chat: chatId,
        },
    })

    for (const filter of filters) {
        try {
            const regex = new RegExp(`^${filter.filter}$`, 'i')
            const messageText = 'text' in ctx.message ? ctx.message.text : ''
            const messageCaption = 'caption' in ctx.message ? ctx.message.caption : ''

            if ((messageText && messageText.match(regex))
                || (messageCaption && messageCaption.match(regex))) {
                const respuesta = JSON.parse(filter.respuesta)
                const markup = respuesta.reply_markup ?? undefined
                const replyToId = ctx.message.reply_to_message?.message_id ?? ctx.message.message_id
                const html = respuesta.text
                    ? entitiesToHtml(respuesta.text, respuesta.entities)
                    : respuesta.caption
                        ? entitiesToHtml(respuesta.caption, respuesta.caption_entities)
                        : ''

                const replyOpts = {
                    reply_parameters: { message_id: replyToId },
                    reply_markup: markup,
                }

                if (filter.tipo === 'text') {
                    return await ctx.reply(html, replyOpts)
                }
                else if (filter.tipo === 'photo') {
                    return await ctx.replyWithPhoto(
                        respuesta.photo[respuesta.photo.length - 1].file_id,
                        { caption: html, ...replyOpts },
                    )
                }
                else if (filter.tipo === 'sticker') {
                    return await ctx.replyWithSticker(respuesta.sticker.file_id, replyOpts)
                }
                else if (filter.tipo === 'voice') {
                    return await ctx.replyWithVoice(respuesta.voice.file_id, { caption: html, ...replyOpts })
                }
                else if (filter.tipo === 'video') {
                    return await ctx.replyWithVideo(respuesta.video.file_id, { caption: html, ...replyOpts })
                }
                else if (filter.tipo === 'audio') {
                    return await ctx.replyWithAudio(respuesta.audio.file_id, { caption: html, ...replyOpts })
                }
                else {
                    return await ctx.replyWithDocument(respuesta.document.file_id, { caption: html, ...replyOpts })
                }
            }
        } catch (error) {
            console.log(error)
        }
    }
})

export default filtros
