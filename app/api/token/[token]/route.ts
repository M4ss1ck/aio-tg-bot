import { webhookCallback } from "grammy";
import { logger } from "../../../../utils/logger"
import { createBot } from "../../../../utils/multibots"
import { getWebhookOptions, logIncomingUpdate } from "../../../../telegram/webhook-options"

export async function POST(
    request: Request,
    { params }: { params: { token: string } }
) {
    const token = params.token;
    let creationTimeout: ReturnType<typeof setTimeout> | undefined;
    try {
        await logIncomingUpdate(request, token.split(':')[0])
        // Race creation against a timeout that rejects into this try/catch.
        // A bare `setTimeout(() => throw)` would surface as an uncaught
        // exception and crash the whole server (all bots) instead.
        const bot = await Promise.race([
            createBot(token as string),
            new Promise<never>((_, reject) => {
                creationTimeout = setTimeout(() => reject(new Error('Bot creation timed out')), 10000);
            }),
        ]);

        if (!bot) {
            return Response.json({}, { status: 200 });
        }

        // Use grammY's webhookCallback for proper update handling
        const handleUpdate = webhookCallback(bot, "std/http", getWebhookOptions());
        return await handleUpdate(request);
    } catch (error) {
        logger.error('Error handling bot:', error);
        if (error instanceof Error && error.stack) {
            logger.debug(error.stack);
        }
        return Response.json({}, { status: 200 });
    } finally {
        clearTimeout(creationTimeout);
    }
}
