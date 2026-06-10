import { Composer } from 'grammy'
import type { MyContext } from '../types'
import { prisma } from '../../db/prisma'
import { convertMsToTime } from '../../utils/functions'

const afk = new Composer<MyContext>()

afk.command(['afk', 'brb'], async (ctx) => {
  const msg = ctx.message?.text?.split(' ').slice(1).join(' ')
  await prisma.afk.upsert({
    where: {
      id: ctx.from!.id.toString()
    },
    create: {
      id: ctx.from!.id.toString(),
      username: ctx.from?.username,
      msg: msg ?? ctx.t('No reason provided'),
      date: new Date()
    },
    update: {
      username: ctx.from?.username,
      msg: msg ?? ctx.t('No reason provided') as string,
      date: new Date()
    }
  })
  const text = msg ? ctx.t('You AFK {{reason}}', { reason: msg }) : ctx.t("You are now AFK")
  return ctx.reply(text as string)
})

afk.use(async (ctx, next) => {
  if (ctx.from?.id) {
    const afkList = await prisma.afk.findMany()
    const idList = afkList.map(afk => afk.id)
    const usernameList = afkList.map(afk => afk.username)
    const usernameRegexp = new RegExp(`@(${usernameList.join('|')})`, 'g')
    if (idList.includes(ctx.from.id.toString())) {
      const afkRecord = afkList.find(a => a.id === ctx.from?.id.toString())
      if (afkRecord) {
        const date = new Date(afkRecord.date)
        const diff = convertMsToTime(new Date().getTime() - date.getTime())
        await prisma.afk.delete({
          where: {
            id: ctx.from.id.toString()
          }
        })
        ctx.reply(ctx.t("{{user}} is no longer AFK after {{time}}", { user: ctx.from.first_name, time: diff }) as string)
      }
    } else if (ctx.message && 'reply_to_message' in ctx.message && ctx.message.reply_to_message?.from?.id && idList.includes(ctx.message.reply_to_message.from.id.toString())) {
      const afkRecord = afkList.find(a => ctx.message && 'reply_to_message' in ctx.message && ctx.message.reply_to_message?.from?.id && a.id === ctx.message?.reply_to_message?.from.id.toString())
      if (afkRecord) {
        const date = new Date(afkRecord.date)
        const diff = convertMsToTime(new Date().getTime() - date.getTime())
        ctx.reply(ctx.t("{{user}} is AFK since {{time}} {{reason}}", { user: ctx.message.reply_to_message.from.first_name, time: diff, reason: afkRecord.msg }) as string)
      }
    } else if (
      ctx.message &&
      'text' in ctx.message &&
      ctx.message.text &&
      usernameRegexp.test(ctx.message.text)
    ) {
      const usernames = ctx.message.text.match(usernameRegexp)
      if (usernames) {
        for (const username of usernames) {
          const afkRecord = afkList.find(a => a.username === username.slice(1))
          if (afkRecord) {
            const date = new Date(afkRecord.date)
            const diff = convertMsToTime(new Date().getTime() - date.getTime())
            ctx.reply(ctx.t("{{user}} is AFK since {{time}} {{reason}}", { user: afkRecord.username, time: diff, reason: afkRecord.msg }) as string)
          }
        }
      }
    }
  }
  return next()
})

export default afk
