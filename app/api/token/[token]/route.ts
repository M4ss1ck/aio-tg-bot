import { webhookCallback } from "grammy";
import { logger } from "../../../../utils/logger"
import { createBot } from "../../../../utils/multibots"

export async function POST(
    request: Request,
    { params }: { params: { token: string } }
) {
    const token = params.token;
    try {
        const botCreationTimeout = setTimeout(() => {
            throw new Error('Bot creation timed out');
        }, 10000);
        const bot = await createBot(token as string)

        if (!bot) {
            clearTimeout(botCreationTimeout)
            return Response.json({}, { status: 200 });
        }
        
        clearTimeout(botCreationTimeout);

        // Use grammY's webhookCallback for proper update handling
        const handleUpdate = webhookCallback(bot, "std/http");
        return await handleUpdate(request);
    } catch (error) {
        logger.error('Error handling bot:', error);
        if (error instanceof Error && error.stack) {
            logger.debug(error.stack);
        }
        return Response.json({}, { status: 200 });
    }
}