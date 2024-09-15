import { Composer } from 'telegraf'
import { prisma } from '../../db/prisma'

const createUser = new Composer()

createUser.use(async (ctx, next) => {
  if (
    ctx.from?.id
    && !global.USUARIOS[ctx.from.id.toString()]
  ) {
    global.USUARIOS[ctx.from.id.toString()] = await prisma.user.upsert({
      where: {
        tg_id: `${ctx.from.id}`,
      },
      create: {
        tg_id: `${ctx.from.id}`,
        rep: 0,
        nick: ctx.from.first_name,
        fecha: new Date(),
        lang: ctx.from.language_code ?? 'es',
      },
      update: {},
    })
  }
  return next()
})

export default createUser
