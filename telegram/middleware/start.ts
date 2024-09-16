import { Composer, Markup } from "telegraf";
import { signatureFunc } from "../../utils/functions";
import { prisma } from "../../db/prisma";
import { localDB } from "../../db/local";
import { logger } from "../../utils/logger";
import { domain } from "../../config/constants";
import type { MyContext } from '../interfaces'

const start = new Composer<MyContext>()

start.start(async ctx => {
    if (ctx.chat.type === 'private') {
        const url = `https://${domain}/`
        await ctx.replyWithHTML(
            ctx.t('<b>Hola, {{name}}!</b>\nEnvía <code>/ayuda</code> para ver algunas opciones', {
                name: ctx.message.from.first_name,
            }),
            Markup.inlineKeyboard([
                Markup.button.webApp('WebApp', url)
            ])).catch((e) => logger.error(e))
    } else {
        await ctx.replyWithHTML(ctx.t('<b>Hola, {{name}}!</b>\nEnvía <code>/ayuda</code> para ver algunas opciones', {
            name: ctx.message.from.first_name,
        })).catch((e) => logger.error(e))
    }
})

export default start
