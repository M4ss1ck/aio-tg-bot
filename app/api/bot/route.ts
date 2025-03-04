import { bot } from "../../../telegram/bot"
import { logger } from "../../../utils/logger"

export async function POST(request: Request) {
    if (!request.body) {
        return Response.json({}, { status: 200 });
    }

    try {
        const body = await request.json();

        const updateTimeout = setTimeout(() => {
            throw new Error('Bot update timed out');
        }, 30000); // 30-second timeout

        await bot.handleUpdate(body);
        clearTimeout(updateTimeout);
    } catch (error) {
        logger.error('Error handling bot update:', error);
        if (error instanceof Error && error.stack) {
            logger.debug(error.stack);
        }
    }

    return Response.json({}, { status: 200 });
}