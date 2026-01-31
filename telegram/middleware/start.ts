import { Composer, InlineKeyboard } from 'grammy'
import { logger } from '../../utils/logger'
import { domain } from '../../config/constants'
import type { MyContext } from '../types'

const start = new Composer<MyContext>()

start.command('start', async (ctx) => {
    if (ctx.chat?.type === 'private') {
        const url = `https://${domain}/`
        const keyboard = new InlineKeyboard()
            .webApp('WebApp', url)
        await ctx.reply(
            ctx.t('<b>Hola, {{name}}!</b>\nEnvía <code>/ayuda</code> para ver algunas opciones', {
                name: ctx.message?.from?.first_name ?? 'Usuario',
            }) as string,
            { reply_markup: keyboard }
        ).catch((e) => logger.error(e))
    } else {
        await ctx.reply(
            ctx.t('<b>Hola, {{name}}!</b>\nEnvía <code>/ayuda</code> para ver algunas opciones', {
                name: ctx.message?.from?.first_name ?? 'Usuario',
            }) as string
        ).catch((e) => logger.error(e))
    }
})

export default start
