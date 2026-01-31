import { Composer, InlineKeyboard } from 'grammy'
import type { MyContext } from '../types'

const replacer = new Composer<MyContext>()

replacer.hears(/^\/(s|s@\w+)(\/)?$/i, ctx =>
    ctx.reply(
        ctx.t('Debe escoger qué parte del mensaje desea reemplazar y con qué desea hacerlo.\nPor ejemplo, si tenemos un mensaje que diga "Eres feo" y queremos transformarlo en "Eres hermoso", debemos usar <code>/s/feo/hermoso</code> respondiendo dicho mensaje.\n\n<b>Nota:</b> Si el bot es administrador, borrará nuestro mensaje') as string,
        {
            reply_parameters: { message_id: ctx.message?.message_id ?? 0 },
        },
    ),
)

replacer.hears(/^\/(s|s@\w+)\/(.+)?\/(.+)?/i, (ctx) => {
    let [, , search, replace] = ctx.match
    search = search ?? ''
    replace = replace ?? ''
    let text = ''
    if (ctx.message?.reply_to_message) {
        let msg = 'text' in ctx.message.reply_to_message && ctx.message.reply_to_message.text
            ? ctx.message.reply_to_message.text
            : 'caption' in ctx.message.reply_to_message
                ? ctx.message.reply_to_message.caption ?? ''
                : ''
        msg = msg.replace('En realidad quisiste decir: \n\n"', '')
        text
            = `<b>${ctx.t('En realidad quisiste decir')}:</b> \n\n"${msg.replace(new RegExp(search, 'g'), replace)
            }"`
        ctx
            .reply(text, {
                reply_parameters: { message_id: ctx.message.reply_to_message.message_id },
            })
            .then(() => {
                ctx.deleteMessage().catch(() => {
                    console.log(ctx.t('No se pudo borrar el mensaje'))
                    const keyboard = new InlineKeyboard()
                        .text(ctx.t('Borrar') as string, 'del')
                    ctx.reply(ctx.t('No pude borrar el mensaje') as string, { reply_markup: keyboard })
                })
            })
    }
    else {
        ctx.reply(ctx.t('Debes responder un mensaje o de lo contrario no funcionará')!, {
            reply_parameters: { message_id: ctx.message?.message_id ?? 0 },
        })
    }
})

export default replacer
