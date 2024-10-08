import { Composer } from 'telegraf'
import { prisma } from '../../db/prisma'
import { setRango } from '../../utils/functions'
import type { MyContext } from '../interfaces'

const my_id = process.env.ADMIN_ID

const reputation = new Composer<MyContext>()

// reputacion

reputation.hears(/^\++$/, async (ctx) => {
  if (ctx.message.reply_to_message && ctx.message.reply_to_message.from) {
    // id del remitente
    const from_id = ctx.message.from.id.toString()

    const remitente = await prisma.user.upsert({
      where: {
        tg_id: from_id,
      },
      create: {
        tg_id: from_id,
        rep: 1,
        nick: ctx.message.from.first_name,
        fecha: new Date(),
        rango: setRango(1),
      },
      update: {},
    })
    const reply_id = ctx.message.reply_to_message.from.id.toString()

    if (reply_id === from_id && from_id !== my_id) {
      return ctx.replyWithHTML(
        `<a href="tg://user?id=${from_id}">${remitente.nick}</a> ${ctx.t('ha intentado hacer trampas... \n<em>qué idiota</em>')}`,
      )
    }
    else {
      const destinatario = await prisma.user.upsert({
        where: {
          tg_id: reply_id,
        },
        create: {
          tg_id: reply_id,
          rep: 1,
          nick: ctx.message.reply_to_message.from.first_name,
          fecha: new Date(),
          rango: setRango(1),
        },
        update: {
          rep: {
            increment: 1,
          },
        },
      })

      // set global state
      // global.USUARIOS = await getUsers()

      const text = `<a href="tg://user?id=${reply_id}">${destinatario.nick}</a> ${ctx.t('tiene')} ${destinatario.rep} ${ctx.t('puntos de reputación ahora, cortesía de')} <a href="tg://user?id=${from_id}">${remitente.nick}</a>`
      return ctx.replyWithHTML(text)
    }
  }
})

reputation.hears(/^(\-|—)+$/, async (ctx) => {
  if (ctx.message.reply_to_message && ctx.message.reply_to_message.from) {
    const from_id = ctx.message.from.id.toString()

    const remitente = await prisma.user.upsert({
      where: {
        tg_id: from_id,
      },
      create: {
        tg_id: from_id,
        rep: -1,
        nick: ctx.message.from.first_name,
        fecha: new Date(),
        rango: setRango(-1),
      },
      update: {},
    })
    const reply_id = ctx.message.reply_to_message.from.id.toString()

    if (reply_id === from_id && from_id !== my_id) {
      return ctx.replyWithHTML(
        `<a href="tg://user?id=${from_id}">${remitente.nick}</a> ${ctx.t('ha intentado hacer trampas... \n<em>qué idiota</em>')}`,
      )
    }
    else {
      const destinatario = await prisma.user.upsert({
        where: {
          tg_id: reply_id,
        },
        create: {
          tg_id: reply_id,
          rep: 1,
          nick: ctx.message.reply_to_message.from.first_name,
          fecha: new Date(),
          rango: setRango(1),
        },
        update: {
          rep: {
            decrement: 1,
          },
        },
      })

      // set global state
      // global.USUARIOS = await getUsers()

      const text = `<a href="tg://user?id=${reply_id}">${destinatario.nick}</a> ${ctx.t('tiene')} ${destinatario.rep} ${ctx.t('puntos de reputación ahora, cortesía de')} <a href="tg://user?id=${from_id}">${remitente.nick}</a>`
      return ctx.replyWithHTML(text)
    }
  }
})

reputation.command('reset_rep', async (ctx) => {
  if (ctx.from.id.toString() === my_id) {
    await prisma.user.updateMany({
      data: {
        rep: 0,
      },
    })

    // set global state
    // global.USUARIOS = await getUsers()

    ctx.reply(ctx.t('Se ha reiniciado la reputación para todos los usuarios')!)
  }
})

reputation.command('set_rep', async (ctx) => {
  if (
    ctx.from.id.toString() === my_id
    && ctx.message.text.substring(9).length > 0
  ) {
    const dest_id = ctx.message.reply_to_message && ctx.message.reply_to_message.from
      ? ctx.message.reply_to_message.from.id.toString()
      : ctx.message.text.match(/\d+/g)?.[0]
    const dest_rep_string = ctx.message.reply_to_message
      ? ctx.message.text.match(/(\d+|\-\d+)/g)?.[0]
      : ctx.message.text.match(/(\d+|\-\d+)/g)?.[1]

    if (dest_id && ctx.message.reply_to_message?.from) {
      const dest_rep = parseInt(dest_rep_string ?? '1')
      const destinatario = await prisma.user.upsert({
        where: {
          tg_id: dest_id,
        },
        create: {
          tg_id: dest_id,
          rep: dest_rep,
          nick: ctx.message.reply_to_message.from.first_name,
          fecha: new Date(),
          rango: setRango(dest_rep),
        },
        update: {
          rep: dest_rep,
        },
      })

      // set global state
      // global.USUARIOS = await getUsers()

      return ctx.replyWithHTML(
        ctx.t('Se ha actualizado el registro de {{dest_nick}} con reputación {{dest_rep}}', {
          dest_nick: destinatario.nick,
          dest_rep,
        }),
      )
    }
  }
  else {
    ctx.reply(
      ctx.t('No tienes suficientes privilegios para ejecutar este comando o lo estás haciendo mal... Me inclino por lo primero')!,
    )
  }
})

reputation.command('nick', async (ctx) => {
  const new_nick = ctx.message.text.substring(6)
  const id = ctx.message.from.id.toString()

  const destinatario = await prisma.user.upsert({
    where: {
      tg_id: id,
    },
    create: {
      tg_id: id,
      rep: 1,
      nick: new_nick,
      fecha: new Date(),
      rango: setRango(1),
    },
    update: {
      nick: new_nick,
    },
  })

  return ctx
    .replyWithHTML(
      ctx.t('El nick de <b>{{name}}</b> será {{nick}}', {
        name: ctx.message.from.first_name,
        nick: destinatario.nick,
      }),
    )
    .catch((error) => {
      console.log(
        ctx.t('[/nick] Hubo un error agregando un usuario'),
        error.description,
      )
      return ctx.replyWithHTML(error.description)
    })
})

export default reputation
