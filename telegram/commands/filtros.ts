import { Composer } from 'grammy'
import { prisma } from '../../db/prisma'
import type { MyContext } from '../types'

const filtros = new Composer<MyContext>()

// Simple HTML escape helper (replacement for @telegraf/entity toHTML)
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

// añadir un atajo
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

            ctx.reply(ctx.t('Filter added', { trigger })!)
        }
        else {
            ctx.reply(ctx.t('Debe escribir un filtro')!)
        }
    }
})
// remover filtro
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

    ctx.reply(`<b>${ctx.t('Lista de filtros:')}</b>\n${filtrosTexto}`)
})

filtros.on('message', async (ctx) => {
    const chatId = ctx.chat?.id.toString() ?? 'global'
    // get filters for that specific chat
    const filters = await prisma.filter.findMany({
        where: {
            chat: chatId,
        },
    })

    for (const filter of filters) {
        try {
            const regex = new RegExp(`^${filter.filter}$`, 'i')
            const messageText = ctx.message && 'text' in ctx.message ? ctx.message.text : ''
            const messageCaption = ctx.message && 'caption' in ctx.message ? ctx.message.caption : ''

            if ((messageText && messageText.match(regex))
                || (messageCaption && messageCaption.match(regex))) {
                const respuesta = JSON.parse(filter.respuesta)
                const markup = respuesta.reply_markup ?? undefined
                const replyToId = ctx.message?.reply_to_message ? ctx.message.reply_to_message.message_id : ctx.message?.message_id
                // Use text or caption as HTML content
                const html = respuesta.text ? escapeHtml(respuesta.text) : (respuesta.caption ? escapeHtml(respuesta.caption) : '')

                if (filter.tipo === 'text') {
                    return ctx.reply(html, {
                        reply_parameters: replyToId ? { message_id: replyToId } : undefined,
                        reply_markup: markup,
                    })
                }
                else if (filter.tipo === 'photo') {
                    return ctx
                        .replyWithPhoto(
                            respuesta.photo[respuesta.photo.length - 1].file_id,
                            {
                                caption: html,
                                reply_parameters: replyToId ? { message_id: replyToId } : undefined,
                                reply_markup: markup,
                            },
                        )
                        .catch(err => ctx.reply(JSON.stringify(err)))
                }
                else if (filter.tipo === 'sticker') {
                    return ctx
                        .replyWithSticker(respuesta.sticker.file_id, {
                            reply_parameters: replyToId ? { message_id: replyToId } : undefined,
                            reply_markup: markup,
                        })
                        .catch(err => ctx.reply(JSON.stringify(err)))
                }
                else if (filter.tipo === 'voice') {
                    return ctx
                        .replyWithVoice(respuesta.voice.file_id, {
                            caption: html,
                            reply_parameters: replyToId ? { message_id: replyToId } : undefined,
                            reply_markup: markup,
                        })
                        .catch(err => ctx.reply(JSON.stringify(err)))
                }
                else if (filter.tipo === 'video') {
                    return ctx
                        .replyWithVideo(respuesta.video.file_id, {
                            caption: html,
                            reply_parameters: replyToId ? { message_id: replyToId } : undefined,
                            reply_markup: markup,
                        })
                        .catch(err => ctx.reply(JSON.stringify(err)))
                }
                else if (filter.tipo === 'audio') {
                    return ctx
                        .replyWithAudio(respuesta.audio.file_id, {
                            caption: html,
                            reply_parameters: replyToId ? { message_id: replyToId } : undefined,
                            reply_markup: markup,
                        })
                        .catch(err => ctx.reply(JSON.stringify(err)))
                }
                else {
                    return ctx
                        .replyWithDocument(respuesta.document.file_id, {
                            caption: html,
                            reply_parameters: replyToId ? { message_id: replyToId } : undefined,
                            reply_markup: markup,
                        })
                        .catch(err => ctx.reply(JSON.stringify(err)))
                }
            }
        } catch (error) {
            console.log(error)
        }
    }
})

export default filtros
