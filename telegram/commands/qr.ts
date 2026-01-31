import { Composer, InputFile } from 'grammy'
import QRCode from 'qrcode'
import Jimp from 'jimp'
import jsQR from 'jsqr'
import type { MyContext } from '../types'

const generateQR = async (text: string) => {
    try {
        return await QRCode.toDataURL(text)
    }
    catch (err) {
        console.error(err)
        return null
    }
}

const qr = new Composer<MyContext>()

qr.command('qr', async (ctx) => {
    if (ctx.message?.reply_to_message && 'photo' in ctx.message.reply_to_message && ctx.message.reply_to_message.photo) {
        try {
            const img = ctx.message.reply_to_message.photo.pop()
            if (img) {
                const file = await ctx.api.getFile(img.file_id)
                const link = `https://api.telegram.org/file/bot${process.env.TOKEN}/${file.file_path}`
                const imgJimp = await Jimp.read(link)
                const array = new Uint8ClampedArray(imgJimp.bitmap.data.buffer)
                const code = jsQR(array, img.width, img.height)
                if (code && code.data) {
                    ctx
                        .reply(code.data, { reply_parameters: { message_id: ctx.message.message_id }, link_preview_options: { is_disabled: true } })
                        .catch(e => console.log(e))
                }
                else {
                    ctx
                        .reply(ctx.t('No data found on image file.\nIf you are sure there\'s a QR Code, blame <a href="https://github.com/cozmo/jsQR">the library</a>') as string, { reply_parameters: { message_id: ctx.message.message_id }, link_preview_options: { is_disabled: true } })
                        .catch(e => console.log(e))
                }
            }
        }
        catch (error) {
            console.log(error)
            ctx
                .reply(ctx.t('Uncaught error while reading the code') as string, { reply_parameters: { message_id: ctx.message.message_id } })
                .catch(e => console.log(e))
        }
    }
    else {
        try {
            const qrText = ctx.message?.reply_to_message && 
            'text' in ctx.message.reply_to_message &&
            ctx.message.reply_to_message.text
                ? ctx.message.reply_to_message.text
                : ctx.message?.text?.replace(/^\/qr((@\w+)?\s+)?/g, '') ?? ''
            const img = await generateQR(qrText)
            if (img && qrText.length > 0) {
                const regex = /^data:.+\/(.+);base64,(.*)$/
                const matches = img.match(regex)
                if (matches) {
                    const data = matches[2]
                    ctx.replyWithPhoto(new InputFile(Buffer.from(data, 'base64')))
                }
            }
            else {
                ctx.reply(ctx.t('QR Code couldn\'t be created') as string)
            }
        }
        catch (error) {
            console.log(error)
            ctx
                .reply(ctx.t('Uncaught error while creating the code') as string, { reply_parameters: { message_id: ctx.message?.message_id ?? 0 } })
                .catch(e => console.log(e))
        }
    }
})

export default qr
