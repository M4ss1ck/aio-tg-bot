import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import { Composer, Markup } from 'telegraf'
import Twig from 'twig'
import { Parser } from 'expr-eval'
import { elapsedTime } from '../../utils/functions'
import type { MyContext } from '../interfaces'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const parser = new Parser({
  operators: {
    add: true,
    concatenate: true,
    conditional: true,
    divide: true,
    factorial: true,
    multiply: true,
    power: true,
    remainder: true,
    subtract: true,
    logical: true,
    comparison: true,
    in: true,
    assignment: true,
  },
})

const my_id = process.env.ADMIN_ID ?? '123'
let victim = process.env.VICTIM_ID ?? '123'
// hora en que arranca el bot
const inicio = performance.now()

const commands = new Composer<MyContext>()

commands.command(['grupo', 'group', 'promo', 'spam'], (ctx) => {
  const buttons: any[][] = [
    [
      Markup.button.url(ctx.t('Grupo'), 'https://t.me/juestin_taim'),
      Markup.button.url(ctx.t('Canal'), 'https://t.me/wasting_time_pro'),
    ],
  ]
  if (ctx.chat.type === 'private') {
    buttons.push([
      Markup.button.webApp('Wasting Blog', 'https://wastingblog.gatsbyjs.io/'),
      Markup.button.webApp('Massick\'s Blog', 'https://massick.gatsbyjs.io/'),
    ])
  }
  buttons.push([Markup.button.callback(ctx.t('Borrar'), 'del')])
  const keyboard = Markup.inlineKeyboard(buttons)

  ctx
    .replyWithPhoto({ source: path.join(__dirname, '../../../images/grupo.webp') }, {
      caption: ctx.t('welcome')!,
      parse_mode: 'HTML',
      ...keyboard,
    })
})

commands.command('ping', (ctx) => {
  const tiempo = elapsedTime(inicio)
  const botUsername = ctx.me
  const messageTime = ctx.message.date
  const delay = Math.round(Date.now() / 1000) - messageTime
  ctx.reply(`[@${botUsername}]\n${ctx.t('Tiempo activo')}: ${tiempo}\n${ctx.t('respuesta')}: ${delay}ms`)
})

commands.command('me', async (ctx) => {
  const text = JSON.stringify(ctx.botInfo, null, 2)
  if (text.length < 4096) {
    ctx.replyWithHTML(text)
  }
  else {
    const chunks = Math.ceil(text.length / 4096)
    for (let i = 0; i < chunks; i++) {
      const index = 4096 * i
      await ctx.replyWithHTML(text.substring(index, index + 4096)).catch(console.log)
    }
  }
})

commands.command('local_info', async (ctx) => {
  const localData = global.USUARIOS[ctx.from.id.toString()]
  const text = `<b>${ctx.t('Información del usuario en BD')}:</b>\n\n${JSON.stringify(localData, null, 2)}`

  ctx.replyWithHTML(text, {
    reply_to_message_id: ctx.message.message_id,
  })

})

commands.command('info', async (ctx) => {
  if (ctx.message.reply_to_message) {
    const msgInfo = JSON.stringify(ctx.message.reply_to_message, null, 2)
    const text = `<b>${ctx.t('Información del mensaje')}:</b>\n${msgInfo}`
    if (text.length < 4096) {
      ctx.replyWithHTML(text, {
        reply_to_message_id: ctx.message.reply_to_message.message_id,
      })
    }
    else {
      const chunks = Math.ceil(text.length / 4096)
      for (let i = 0; i < chunks; i++) {
        const index = 4096 * i
        await ctx.replyWithHTML(text.substring(index, index + 4096), {
          reply_to_message_id: ctx.message.reply_to_message.message_id,
        }).catch(console.log)
      }
    }
  }
  else {
    const text = `<b>${ctx.t('Información del mensaje')}:</b>\nName: ${ctx.message.from.first_name}\nUsername: ${ctx.message.from.username ? '@' + ctx.message.from.username : '-'}\nId: <code>${ctx.message.from.id}</code>\nChat Id: <code>${ctx.message.chat.id}</code>`
    ctx.replyWithHTML(text, {
      reply_to_message_id: ctx.message.message_id,
    })
  }
})

commands.command(['jaja', 'jajaja', 'porn', 'hahaha', 'haha'], (ctx) => {
  if (!ctx.message.reply_to_message) {
    ctx.replyWithHTML(
      `<a href="tg://user?id=${ctx.message.from.id}"> ${ctx.message.from.first_name}</a>, ${ctx.t('el comando se usa respondiendo un mensaje')}`,
    )
  }
  else if (ctx.message.reply_to_message.from?.id.toString() === my_id) {
    ctx
      .replyWithVoice(
        { source: fs.readFileSync(path.join(__dirname, '../../../audio/risas.ogg')) },
        {
          reply_to_message_id: ctx.message.message_id,
        },
      )
      .then(() => ctx.reply(ctx.t('Yo tú no lo vuelvo a intentar')!))
      .catch(console.log)
  }
  else {
    ctx.replyWithVoice(
      { source: fs.readFileSync(path.join(__dirname, '../../../audio/risas.ogg')) },
      {
        reply_to_message_id: ctx.message.reply_to_message.message_id,
      },
    )
      .catch(console.log)
  }
})

commands.command(['/gay', '/ghei'], (ctx) => {
  const replyMarkup = Markup.inlineKeyboard([
    [
      Markup.button.switchToChat(ctx.t('en otro chat'), ctx.t('loca')),
      Markup.button.switchToCurrentChat(ctx.t('aquí mismo'), ctx.t('loca')),
    ],
  ])

  ctx.replyWithHTML(ctx.t('Mi % de loca'), replyMarkup)
})

commands.command(['c', 'calc'], (ctx) => {
  const index = ctx.message.entities ? ctx.message.entities[0].length + 1 : 0
  const math = ctx.message.text.substring(index)
  if (math === '') {
    ctx.replyWithHTML(
      `${ctx.t('Debe introducir una expresión matemática.\nEjemplos')}: <code>/calc 2+3^6</code>\n<code>/calc PI^4</code>\n<code>/calc 25346*3456/32</code>`,
      {
        reply_to_message_id: ctx.message.message_id,
      },
    )
  }
  else {
    try {
      const parsedText = math.replace(/×/g, '*').replace(/[÷:]/g, '/')
      const result = parser.parse(parsedText).simplify()
      ctx.replyWithHTML(`<code>${result}</code>`, {
        reply_to_message_id: ctx.message.message_id,
      })
    }
    catch (error) {
      const errorMessage = JSON.stringify(error)
        .replace(/"/g, ' ')
        .replace(/,/g, ',\n')
        .replace(/{/g, '\n {')
      ctx.replyWithHTML(`<code>${errorMessage}</code>`, {
        reply_to_message_id: ctx.message.message_id,
      })
    }
  }
})

commands.command(['ayuda', 'help'], (ctx) => {
  ctx.replyWithHTML(
    ctx.t('help_msg'),
  )
})

commands.command('say', (ctx) => {
  const text = ctx.message.text.substring(5)
  if (text.length > 0) {
    ctx.replyWithHTML(text)
  }
  else {
    ctx.replyWithHTML(
      ctx.t('Escribe algo después del comando y yo lo repetiré\nEjemplo\: <code>/say Hola</code>'),
    )
  }
})

commands.command('tag', (ctx) => {
  const text = ctx.message.text.substring(5) ?? ''
  const number
    = text.length > 0 ? text.match(/\d+/g)?.[0] ?? '1' : '1'
  const n = parseInt(number ?? '1') > 20 ? 20 : parseInt(number ?? 1)
  const new_victim = ctx.message.reply_to_message && ctx.message.reply_to_message.from
    ? ctx.message.reply_to_message.from.id
    : victim

  if (new_victim.toString() === my_id) {
    ctx.replyWithHTML(
      ctx.t('<a href="tg\://user?id={{id}}">Cariño</a>, no puedo hacer eso', { id: ctx.from.id }),
      {
        reply_to_message_id: ctx.message.message_id,
      },
    )
  }
  else {
    // voy a usar async await para que la salida esté en orden
    // como en https://zellwk.com/blog/async-await-in-loops/
    function sleep(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms))
    }
    const forEnOrden = async () => {
      for (let i = 0; i < n; i++) {
        await sleep(1500).then(() => {
          ctx.replyWithHTML(
            `<a href="tg://user?id=${new_victim}">tag tag</a>\n<em>${ctx.t('llamada número')} ${i + 1
            }</em>`,
          )
        })
      }
    }
    forEnOrden()
  }
})

commands.command('set_victim', (ctx) => {
  const text = ctx.message.text.substring(12) ?? ''
  if (ctx.from.id.toString() === my_id) {
    victim = text.match(/\d+/g)?.[0] ?? ''
    victim !== '' && ctx.reply(ctx.t('Ahora {{victim}} es la victima', { victim })!)
  }
})

commands.command('like', async (ctx) => {
  const text
    = ctx.message.text.length > 5
      ? ctx.message.text.substring(6)
      : ctx.from.first_name
  if (ctx.message.reply_to_message) {
    await ctx.replyWithHTML(ctx.t('A {{text}} le gusta esto 👆👀', { text }), {
      reply_to_message_id: ctx.message.reply_to_message.message_id,
    })
  }
  else {
    await ctx.replyWithHTML(
      ctx.t('A {{text}} le gusta alguien aquí pero es tímido 😳', { text }),
    )
  }
  await ctx.deleteMessage().catch(() => {
    console.log(ctx.t('No se pudo borrar el mensaje'))
  })
})

commands.command('run', async (ctx) => {
  if (ctx.from.id.toString() === my_id) {
    const text = ctx.message.text.substring(5)
    try {
      const template = Twig.twig({
        data: text,
      })
      await template.renderAsync({
        telegram: ctx.telegram,
        ctx,
        here: ctx.chat.id,
      })
    }
    catch (error: any) {
      if ('message' in error)
        ctx.replyWithHTML(error.message)
    }
  }
  else {
    ctx.reply(ctx.t('Not admin')!)
  }
})

export default commands
