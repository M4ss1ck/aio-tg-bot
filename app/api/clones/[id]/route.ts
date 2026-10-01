import { webhookCallback } from 'grammy'
import { createBot } from '../../../../utils/multibots'
import { prisma } from '../../../../db/prisma'
import { getWebhookOptions } from '../../../../telegram/webhook-options'
import { createClonesPOST } from '../handler'

export const POST = createClonesPOST({
    findCloneRecord: (id) => prisma.bot.findUnique({ where: { id } }),
    createCloneBot: (token) => createBot(token),
    dispatchUpdate: (bot, request, secret) =>
        webhookCallback(
            bot as Parameters<typeof webhookCallback>[0],
            'std/http',
            getWebhookOptions(secret),
        )(request),
})