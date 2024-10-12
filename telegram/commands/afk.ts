import { Composer } from 'telegraf'
import type { MyContext } from '../interfaces'
import { prisma } from '../../db/prisma'
import { convertMsToTime } from '../../utils/functions'

const afk = new Composer<MyContext>()

afk.command('afk', async (ctx) => {
    const msg = ctx.message.text?.split(' ').slice(1).join(' ')
    await prisma.afk.upsert({
        where: {
            id: ctx.from.id.toString()
        },
        create: {
            id: ctx.from.id.toString(),
            username: ctx.from.username,
            msg: msg ?? ctx.t('No reason provided'),
            date: new Date()
        },
        update: {
            username: ctx.from.username,
            msg: msg ?? ctx.t('No reason provided'),
            date: new Date()
        }
    })
    const text = msg ? ctx.t('You AFK {{reason}}', { reason: msg }) : ctx.t("You are now AFK")
    return ctx.replyWithHTML(text)

})

afk.use(async (ctx, next) => {
    if (ctx.from?.id) {
        const afkList = await prisma.afk.findMany()
        const idList = afkList.map(afk => afk.id)
        const usernameList = afkList.map(afk => afk.username)
        const usernameRegexp = new RegExp(`@(${usernameList.join('|')})`, 'g')
        if (idList.includes(ctx.from.id.toString())) {
            const afk = afkList.find(afk => afk.id === ctx.from?.id.toString())
            if (afk) {
                const date = new Date(afk.date)
                const diff = convertMsToTime(new Date().getTime() - date.getTime())
                await prisma.afk.delete({
                    where: {
                        id: ctx.from.id.toString()
                    }
                })
                ctx.replyWithHTML(ctx.t("{{user}} is no longer AFK after {{time}}", { user: ctx.from.first_name, time: diff }))
            }
        } else if (ctx.message && 'reply_to_message' in ctx.message && ctx.message.reply_to_message?.from?.id && idList.includes(ctx.message.reply_to_message.from.id.toString())) {
            const afk = afkList.find(afk => ctx.message && 'reply_to_message' in ctx.message && ctx.message.reply_to_message?.from?.id && afk.id === ctx.message?.reply_to_message?.from.id.toString())
            if (afk) {
                const date = new Date(afk.date)
                const diff = convertMsToTime(new Date().getTime() - date.getTime())
                ctx.replyWithHTML(ctx.t("{{user}} is AFK since {{time}} {{reason}}", { user: ctx.message.reply_to_message.from.first_name, time: diff, reason: afk.msg }))
            }
        } else if (ctx.message && 'text' in ctx.message && usernameRegexp.test(ctx.message.text)) {
            const usernames = ctx.message.text.match(usernameRegexp)
            if (usernames) {
                for (const username of usernames) {
                    const afk = afkList.find(afk => afk.username === username.slice(1))
                    if (afk) {
                        const date = new Date(afk.date)
                        const diff = convertMsToTime(new Date().getTime() - date.getTime())
                        ctx.replyWithHTML(ctx.t("{{user}} is AFK since {{time}} {{reason}}", { user: afk.username, time: diff, reason: afk.msg }))
                    }
                }
            }
        }
    }
    return next()
})

export default afk