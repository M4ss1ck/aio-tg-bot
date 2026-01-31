import { Composer, InputFile } from 'grammy'
import type { MyContext } from '../types'

const admin = new Composer<MyContext>()

const my_id = process.env.ADMIN_ID ?? '123'

// Custom ACL middleware for admin-only commands
const adminOnly = async (ctx: MyContext, next: () => Promise<void>) => {
    if (ctx.from?.id?.toString() === my_id) {
        return next()
    }
}

admin.command('quit', adminOnly, async (ctx) => {
    if (ctx.from?.id?.toString() === my_id) {
        await ctx.reply(ctx.i18next.t('bye')!)
        if (ctx.chat?.type !== 'private') {
            await ctx.api.leaveChat(ctx.chat!.id)
        } else {
            await ctx.reply(ctx.i18next.t('kidding')!)
        }
    }
})

admin.command('admin', adminOnly, (ctx) => {
    ctx.reply(ctx.i18next.t('Eres administrador de este bot')!)
})

admin.command('users', adminOnly, (ctx) => {
    const users = Object.values(global.USUARIOS).map(user => `[${user.rep}] ${user.nick} (${user.tg_id})`)
    ctx.reply(`<pre>${JSON.stringify(users, null, 2).slice(0, 2037)}</pre>`)
})

admin.command('export', adminOnly, async (ctx) => {
    await ctx.replyWithDocument(new InputFile('./prisma/dev.db', 'dev.db'), {
        caption: ctx.i18next.t('Database exported successfully!')!,
    })
})

export default admin
