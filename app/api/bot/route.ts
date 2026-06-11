import { webhookCallback } from "grammy";
import { getBot, loadUsers } from "../../../telegram/bot"
import { logger } from "../../../utils/logger"
import { getWebhookOptions, logIncomingUpdate } from "../../../telegram/webhook-options"
import { getWebhookSecretToken } from "../../../telegram/webhook-secret"

export async function POST(request: Request) {
    if (!request.body) {
        return Response.json({}, { status: 200 });
    }

    try {
        await logIncomingUpdate(request, 'main')
        await loadUsers()
        const handleUpdate = webhookCallback(getBot(), "std/http", getWebhookOptions(getWebhookSecretToken()));
        return await handleUpdate(request);
    } catch (error) {
        logger.error('Error handling bot update:', error);
        if (error instanceof Error && error.stack) {
            logger.debug(error.stack);
        }
        return Response.json({}, { status: 200 });
    }
}
