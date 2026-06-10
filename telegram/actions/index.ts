import { Composer } from 'grammy'
import type { MyContext } from '../types'

const actions = new Composer<MyContext>()

actions.callbackQuery('del', (ctx) => ctx.deleteMessage())

export default actions
