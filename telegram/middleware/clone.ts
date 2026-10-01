import { Composer, InlineKeyboard } from 'grammy'
import { prisma } from '../../db/prisma'
import { logger } from '../../utils/logger'
import { createBot, setWH } from '../../utils/multibots'
import {
    CLONE_TOKEN_RE,
    createManagedCloneComposer,
    createPrismaManagedCloneStore,
    extractCloneArg,
} from './managedClone'
import type { MyContext } from '../types'

const manual = new Composer<MyContext>()

manual.command('clone', async (ctx) => {
    try {
        logger.success('Clone command')
        const token = extractCloneArg(ctx.message?.text ?? '')
        // Only the manual token path is handled here; the managed composer
        // answers empty or malformed /clone invocations.
        if (!CLONE_TOKEN_RE.test(token)) {
            return
        }
        const bot = await createBot(token)

        if (bot) {
            await prisma.bot
                .upsert({
                    where: {
                        token: token
                    },
                    update: {
                        owner: ctx.from?.id?.toString() ?? ''
                    },
                    create: {
                        token,
                        owner: ctx.from?.id?.toString() ?? ''
                    }
                })
                .then(() => {
                    const keyboard = new InlineKeyboard()
                        .text('Set Webhook', `setwh_${token}`)
                    ctx.reply('Bot created successfully!\nPress button below to set webhook', {
                        reply_markup: keyboard
                    })
                })
                .catch(e => {
                    logger.error('Failed to upsert clon bot')
                    logger.error(e)
                })
        } else {
            await ctx.reply('Failed to create bot')
        }
    } catch (error) {
        logger.error(error)
    }
})

manual.callbackQuery(/setwh_/i, async (ctx) => {
    if ('data' in ctx.callbackQuery) {
        await ctx.answerCallbackQuery().catch(e => logger.error(e))
        const token = ctx.callbackQuery.data.replace(/setwh_/i, '')
        const isSet = await setWH(token)
        if (isSet) {
            await ctx
                .reply('Webhook was set.')
                .catch(e => {
                    logger.error('Failed to send response')
                    logger.error(e)
                })
        } else {
            await ctx
                .reply('Error setting webhook.')
                .catch(e => {
                    logger.error('Failed to send response')
                    logger.error(e)
                })
        }
    }
})

const clone = new Composer<MyContext>()

clone.use(createManagedCloneComposer({ store: createPrismaManagedCloneStore() }))
clone.use(manual)

export default clone
