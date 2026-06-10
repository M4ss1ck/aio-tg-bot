import { Composer } from 'grammy'
import { prisma } from '../../db/prisma'
import type { MyContext } from '../types'

const love = new Composer<MyContext>()

love.command('love', async (ctx) => {
    const users = await prisma.user.findMany({
        select: {
            tg_id: true,
            nick: true,
        },
    })
    const i = Math.floor(Math.random() * users.length)
    const lover1 = users[i]
    const filteredUsers = users.filter(user => user.tg_id !== lover1.tg_id)
    const j = Math.floor(Math.random() * filteredUsers.length)
    const lover2 = filteredUsers[j]
    if (!lover2) {
        ctx.reply(
            `<b>${ctx.t('Pareja del día')}:</b>\n\n<a href="tg://user?id=${lover1.tg_id}">${lover1.nick}</a> ${ctx.t('consigo mismo/a')}`,
        )
    }
    else {
        ctx.reply(
            `<b>Pareja del día:</b>\n\n<a href="tg://user?id=${lover1.tg_id}">${lover1.nick}</a> 💘 <a href="tg://user?id=${lover2.tg_id}">${lover2.nick}</a>`,
        )
    }
})

export default love
