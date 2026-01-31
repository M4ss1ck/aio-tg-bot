import { Composer } from 'grammy'
import type { MyContext } from '../types'

const logger = new Composer<MyContext>()

logger.use(async (ctx, next) => {
    try {
        let messageText = `[${ctx.from?.id?.toString() ?? 'n/a'}] `
        if (ctx.message?.text?.startsWith('/')) {
            messageText += `[command] ${ctx.message.text}`
            console.log(messageText)
        } else if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
            messageText += `[action] ${ctx.callbackQuery.data}`
            console.log(messageText)
        } else if (ctx.inlineQuery?.query) {
            messageText += `[inline] ${ctx.inlineQuery.query}`
            console.log(messageText)
        }
    } catch (error) {
        console.log('Error in logger middleware')
        console.log(error)
    }
    return next()
})

export default logger
