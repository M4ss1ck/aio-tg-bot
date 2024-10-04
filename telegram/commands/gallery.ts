import { Composer, Markup } from "telegraf";
import type { MyContext } from "../interfaces";
import { prisma } from "../../db/prisma";
import { domain, photoLimitPerUser } from "../../config/constants";
import { localDB } from "../../db/local";

const gallery = new Composer<MyContext>()

gallery.command(['gallery', 'g'], async (ctx) => {
    const galleryURL = `https://${domain}/gallery/${ctx.from.id}`
    if (ctx.message.reply_to_message && 'photo' in ctx.message.reply_to_message) {
        // get how many photos the user has
        const photos = await prisma.photo.count({
            where: {
                userId: ctx.from.id.toString()
            }
        })

        if (photos >= photoLimitPerUser) {
            return ctx.reply(`You have reached the maximum amount of photos allowed in your gallery`, Markup.inlineKeyboard([
                Markup.button.webApp('Open Gallery', galleryURL)
            ]))
        }


        const msg = ctx.message.reply_to_message
        const tgImage = msg.photo[msg.photo.length - 1]
        const file = await ctx.telegram.getFile(tgImage.file_id)


        // Store the photo in the database
        const token = localDB.get('currentToken')
        await prisma.photo.create({
            data: {
                userId: ctx.from.id.toString(),
                path: file.file_path as string,
                caption: msg.caption,
                width: tgImage.width,
                height: tgImage.height,
                token: token ?? process.env.BOT_TOKEN!,
            }
        })

        // console.log(file)
        ctx.reply(`Photo added to your carousel: ${galleryURL}`, Markup.inlineKeyboard([
            Markup.button.webApp('Open Gallery', galleryURL)
        ]));
    } else {
        ctx.reply(`this command is used replying an image in order to add it to your personal gallery at ${galleryURL}`)
    }
})

export default gallery