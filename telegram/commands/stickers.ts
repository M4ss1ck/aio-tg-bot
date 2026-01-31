import { unlink } from 'fs/promises'
import { Composer, InputFile } from 'grammy'
import Jimp from 'jimp'
import sharp from 'sharp'
import type { MyContext } from '../types'

const stickers = new Composer<MyContext>()

stickers.command('sticker', async (ctx) => {
    if (ctx.message?.reply_to_message) {
        try {
            const messagePhoto = 'photo' in ctx.message.reply_to_message && ctx.message.reply_to_message.photo ? ctx.message.reply_to_message.photo.pop() : undefined
            if (messagePhoto) {
                const file = await ctx.api.getFile(messagePhoto.file_id)
                const link = `https://api.telegram.org/file/bot${process.env.TOKEN}/${file.file_path}`
                const imgJimp = await Jimp.read(link)
                // Set the maximum width and height of the resized image
                const maxWidth = 512;
                const maxHeight = 512;
                // Get the current dimensions of the image
                const { width, height } = messagePhoto;
                // Calculate the scale factor for each dimension
                const scaleFactorX = maxWidth / width;
                const scaleFactorY = maxHeight / height;
                // Use the smaller scale factor to resize the image
                const scaleFactor = Math.min(scaleFactorX, scaleFactorY);
                const newWidth = Math.round(width * scaleFactor);
                const newHeight = Math.round(height * scaleFactor);

                imgJimp.resize(newWidth, newHeight)

                const path = `images/sticker_${Date.now()}.png`
                const dest = path.replace('.png', '.webp')
                await imgJimp.writeAsync(path)

                sharp(path)
                    .webp()
                    .toFile(dest)
                    .then(async () => {
                        await ctx.replyWithSticker(new InputFile(dest)).catch(console.error)
                        await unlink(dest)
                    })
                    .catch((err) => {
                        console.error(err);
                    });
            }
        } catch (error) {
            console.error(error)
        }
    }
})

export default stickers
