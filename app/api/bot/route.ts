import { webhookCallback } from "grammy";
import { bot } from "../../../telegram/bot"
import { logger } from "../../../utils/logger"

// Create grammY webhook handler
const handleUpdate = webhookCallback(bot, "std/http");

export async function POST(request: Request) {
    if (!request.body) {
        return Response.json({}, { status: 200 });
    }

    try {
        return await handleUpdate(request);
    } catch (error) {
        logger.error('Error handling bot update:', error);
        if (error instanceof Error && error.stack) {
            logger.debug(error.stack);
        }
        return Response.json({}, { status: 200 });
    }
}