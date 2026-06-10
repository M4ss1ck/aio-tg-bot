import { Composer, InlineKeyboard } from 'grammy'
import type { MyContext } from '../types'
import { prisma } from '../../db/prisma'
import { domain, photoLimitPerUser } from '../../config/constants'
import { localDB } from '../../db/local'
import { logger } from '../../utils/logger'

const gallery = new Composer<MyContext>()

gallery.command(['gallery', 'g'], async (ctx) => {
    const galleryURL = `https://${domain}/gallery/${ctx.from?.id}`
    if (ctx.message?.reply_to_message && 
      'photo' in ctx.message.reply_to_message && 
      ctx.message.reply_to_message.photo
    ) {
        // get how many photos the user has
        const photos = await prisma.photo.count({
            where: {
                userId: ctx.from!.id.toString()
            }
        })

        if (photos >= photoLimitPerUser) {
            const keyboard = new InlineKeyboard()
                .webApp('Open Gallery', galleryURL)
            return ctx.reply(`You have reached the maximum amount of photos allowed in your gallery`, { reply_markup: keyboard })
        }


        const msg = ctx.message.reply_to_message
        const tgImage = ctx.message.reply_to_message.photo[ctx.message.reply_to_message.photo.length - 1]
        const file = await ctx.api.getFile(tgImage.file_id)


        // Store the photo in the database
        const token = localDB.get('currentToken')
        await prisma.photo.create({
            data: {
                userId: ctx.from!.id.toString(),
                path: file.file_path as string,
                caption: msg.caption,
                width: tgImage.width,
                height: tgImage.height,
                token: token ?? process.env.TOKEN!,
            }
        })
            .then(() => {
                const keyboard = new InlineKeyboard()
                    .webApp('Open Gallery', galleryURL)
                return ctx.reply(`Photo added to your carousel: ${galleryURL}`, { reply_markup: keyboard })
            })
            .catch((err) => {
                logger.info('Error in gallery command')
                logger.error(err)
                return ctx.reply('Error adding photo to gallery')
            })
    } else {
        ctx.reply(`this command is used replying an image in order to add it to your personal gallery at ${galleryURL}`)
    }
})

export default gallery
