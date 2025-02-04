import { bot } from "../../../telegram/bot"
import { logger } from "../../../utils/logger"

export async function POST(request: Request) {
    // Early validation
    if (!request.body) {
        return Response.json({}, { status: 200 });
    }

    try {
        const body = await request.json();

        // Critical path - bot update with timeout protection
        const updateTimeout = setTimeout(() => {
            throw new Error('Bot update timed out');
        }, 15000); // 15-second timeout

        await bot.handleUpdate(body);
        clearTimeout(updateTimeout);
    } catch (error) {
        logger.error('Error handling bot update:', error);
        if (error instanceof Error && error.stack) {
            logger.debug(error.stack);
        }
    }

    // Minimal response - server response is not important
    return Response.json({}, { status: 200 });
}