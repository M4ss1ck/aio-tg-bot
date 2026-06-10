import { Composer, InlineKeyboard } from "grammy";
import axios from "axios";

import MarkdownParser from "../../utils/markdownParser";
import { logger } from "../../utils/logger";
import type { MyContext } from "../types";
import { updateUser } from "../global/data";
import { aiModels, adminId, cloudflareApiToken, cloudflareAccountId } from "../../config/constants";
import { localDB } from "../../db/local";

const ai = new Composer<MyContext>();
const apiKey = process.env.OPENROUTER_API_KEY;

// Initialize premium users set if not exists
if (!localDB.has('premiumUsers')) {
    localDB.set('premiumUsers', new Set<string>());
}

ai.use(async (ctx, next) => {
    try {
        if (ctx.from?.id) {
            const userId = ctx.from.id.toString();
            const userObjFromGlobal = global.USUARIOS[userId];
            const userModel = userObjFromGlobal?.model ?? aiModels[0].model;
            ctx.model = userModel;

            // Set isPremium status
            const premiumUsers = localDB.get('premiumUsers') as Set<string>;
            const isAdmin = adminId && userId === adminId;
            ctx.isPremium = isAdmin || premiumUsers.has(userId);
        }
    } catch (error) {
        logger.info('Error in AI middleware');
        logger.error(error);
    }
    return next();
});

// Premium management commands
ai.command("addpremium", async (ctx) => {
    try {
        const userId = ctx.from?.id?.toString();
        if (!userId || userId !== adminId) {
            await ctx.reply("❌ Unauthorized. This command is only available to administrators.");
            return;
        }

        if (!ctx.message) {
            await ctx.reply("❌ Invalid command usage.");
            return;
        }

        // Get user ID from command arguments or replied message
        const commandArg = ctx.message.text.replace(/^\/addpremium\s*/, "").trim();
        let userIdToAdd = commandArg;

        if (!userIdToAdd && ctx.message.reply_to_message?.from?.id) {
            userIdToAdd = ctx.message.reply_to_message.from.id.toString();
        }

        if (!userIdToAdd) {
            await ctx.reply("❌ Please provide a user ID or reply to a user's message.\n\n**Usage:**\n• `/addpremium <user_id>`\n• Reply to a message with `/addpremium`\n\n**Example:** `/addpremium 123456789`");
            return;
        }

        if (!/^\d+$/.test(userIdToAdd)) {
            await ctx.reply("❌ **Invalid User ID:** Please provide a valid numeric user ID (e.g., 123456789).");
            return;
        }

        const premiumUsers = localDB.get('premiumUsers') as Set<string>;
        if (premiumUsers.has(userIdToAdd)) {
            await ctx.reply(`ℹ️ Already Premium: User ${userIdToAdd} is already a premium user.`);
        } else {
            premiumUsers.add(userIdToAdd);
            localDB.set('premiumUsers', premiumUsers);
            await ctx.reply(`✅ Success! User ${userIdToAdd} has been added to premium users.`);
        }
    } catch (error) {
        logger.error("Error in addpremium command:", error);
        await ctx.reply("❌ Error: An unexpected error occurred while adding the premium user.");
    }
});

ai.command("removepremium", async (ctx) => {
    try {
        const userId = ctx.from?.id?.toString();
        if (!userId || userId !== adminId) {
            await ctx.reply("❌ Unauthorized. This command is only available to administrators.");
            return;
        }

        if (!ctx.message) {
            await ctx.reply("❌ Invalid command usage.");
            return;
        }

        // Get user ID from command arguments or replied message
        const commandArg = ctx.message.text.replace(/^\/removepremium\s*/, "").trim();
        let userIdToRemove = commandArg;

        if (!userIdToRemove && ctx.message.reply_to_message?.from?.id) {
            userIdToRemove = ctx.message.reply_to_message.from.id.toString();
        }

        if (!userIdToRemove) {
            await ctx.reply("❌ Please provide a user ID or reply to a user's message.\n\nUsage:\n• `/removepremium <user_id>`\n• Reply to a message with `/removepremium`\n\nExample: `/removepremium 123456789`");
            return;
        }

        if (!/^\d+$/.test(userIdToRemove)) {
            await ctx.reply("❌ Invalid User ID: Please provide a valid numeric user ID (e.g., 123456789).");
            return;
        }

        const premiumUsers = localDB.get('premiumUsers') as Set<string>;
        if (premiumUsers.has(userIdToRemove)) {
            premiumUsers.delete(userIdToRemove);
            localDB.set('premiumUsers', premiumUsers);
            await ctx.reply(`✅ Success! User ${userIdToRemove} has been removed from premium users.`);
        } else {
            await ctx.reply(`ℹ️ Not Premium: User ${userIdToRemove} was not a premium user.`);
        }
    } catch (error) {
        logger.error("Error in removepremium command:", error);
        await ctx.reply("❌ Error: An unexpected error occurred while removing the premium user.");
    }
});

ai.command("listpremium", async (ctx) => {
    try {
        const userId = ctx.from?.id?.toString();
        if (!userId || userId !== adminId) {
            await ctx.reply("❌ Unauthorized. This command is only available to administrators.");
            return;
        }

        const premiumUsers = localDB.get('premiumUsers') as Set<string>;
        const premiumArray = Array.from(premiumUsers);

        if (premiumArray.length === 0) {
            await ctx.reply("📋 No Premium Users Found\n\nThere are currently no premium users in the system.");
        } else {
            const userList = premiumArray.map((userId, index) => `${index + 1}. ${userId}`).join('\n');
            await ctx.reply(`📋 Premium Users (${premiumArray.length}):\n\n${userList}`);
        }
    } catch (error) {
        logger.error("Error in listpremium command:", error);
        await ctx.reply("❌ Error: An unexpected error occurred while retrieving the premium users list.");
    }
});

ai.command("ai_model", async (ctx) => {
    const isPremium = ctx.isPremium || false;

    // Sort models: free models first, then premium models
    const freeModels = aiModels.filter(model => !model.premium);
    const premiumModels = aiModels.filter(model => model.premium);
    const sortedModels = [...freeModels, ...premiumModels];

    const text = "Select your AI model";

    // Build inline keyboard with model buttons
    const keyboard = new InlineKeyboard();
    sortedModels.forEach((model) => {
        // Find original index in aiModels array for callback data
        const originalIndex = aiModels.findIndex(m => m.model === model.model);

        // Add visual indicator for premium models
        const modelName = model.premium ? `🔒 ${model.name} (Premium)` : model.name;

        keyboard.text(modelName, `set_model_${originalIndex}`).row();
    });

    // Add explanation for non-premium users
    const explanation = isPremium
        ? ""
        : "\n\n🔒 Premium models require special access.";

    await ctx.reply(text + explanation, { reply_markup: keyboard });
});

ai.callbackQuery(/set_model_(\d+)/i, async ctx => {
    await ctx.answerCallbackQuery().catch(e => logger.error(e));
    
    if (ctx.callbackQuery.data && ctx.from?.id) {
        const match = ctx.callbackQuery.data.match(/set_model_(\d+)/i);
        const indexString = match?.[1] ?? '0';
        const index = parseInt(indexString);
        const selectedModel = aiModels[index];

        // Check if user is trying to select a premium model without premium access
        if (selectedModel.premium && !ctx.isPremium) {
            await ctx.reply("❌ Access denied. This is a premium model that requires special access. Please contact an admin to upgrade your account.");
            return;
        }

        // Allow selection for free models or premium users accessing premium models
        const model = selectedModel.model;
        await updateUser({ ...global.USUARIOS[ctx.from.id.toString()], model });
        const premiumIndicator = selectedModel.premium ? " 🔒" : "";
        await ctx.reply(`Your AI model has been set to ${model}${premiumIndicator}`);
    }
});


ai.command(["ai", "ia"], async (ctx) => {
    if (!apiKey) {
        await ctx.reply(ctx.t("API key not set. Please contact the bot owner") as string);
        return;
    }

    if (!ctx.message) {
        await ctx.reply("❌ Invalid command usage.");
        return;
    }

    let model = ctx.model ?? aiModels[0].model;

    // Premium model access validation
    const currentModelObj = aiModels.find(ai => ai.model === model);
    if (currentModelObj?.premium && !ctx.isPremium) {
        // User doesn't have premium access - fallback to free model
        const fallbackModel = aiModels.find(ai => !ai.premium);
        if (fallbackModel) {
            model = fallbackModel.model;
            await updateUser({ ...global.USUARIOS[ctx.from!.id.toString()], model: fallbackModel.model });
            await ctx.reply(
                `⚠️ You don't have access to premium models. I've switched you to ${fallbackModel.name} instead.\n\n` +
                "To access premium models, please contact an administrator.",
                { reply_parameters: { message_id: ctx.message.message_id } }
            );
        } else {
            await ctx.reply("No free models available. Please contact the bot owner.", {
                reply_parameters: { message_id: ctx.message.message_id },
            });
            return;
        }
    }

    let search = ctx.message.text.replace(/^\/(ai|ia)((@\w+)?\s+)?/i, "");

    // append replied-to message content
    if (ctx.message.reply_to_message) {
        if ('text' in ctx.message.reply_to_message) {
            search += "\n" + ctx.message.reply_to_message.text;
        }
        else if ('caption' in ctx.message.reply_to_message) {
            search += "\n" + ctx.message.reply_to_message.caption;
        }
    }

    const sanitizedInput = search; // No encoding as it causes issues with response

    if (sanitizedInput.trim().length > 2) {
        try {
            let content: any[] = [{
                type: "text",
                text: sanitizedInput
            }];

            // handle images from current message
            if ('photo' in ctx.message && Array.isArray(ctx.message.photo) && ctx.message.photo.length > 0) {
                const photo = ctx.message.photo.pop();
                if (photo) {
                    const file = await ctx.api.getFile(photo.file_id);
                    const fileUrl = `https://api.telegram.org/file/bot${process.env.TOKEN}/${file.file_path}`;
                    const response = await axios({
                        method: 'get',
                        url: fileUrl,
                        responseType: 'arraybuffer'
                    });
                    const buffer = Buffer.from(response.data, 'binary').toString('base64');

                    // check if model supports images
                    const modelObj = aiModels.find(ai => ai.model === model);
                    if (!modelObj || !modelObj.image) {
                        // Find an image-supporting model that user has access to
                        const fallbackModel = aiModels.find(ai =>
                            ai.image && (ctx.isPremium || !ai.premium)
                        );
                        if (fallbackModel) {
                            model = fallbackModel.model;
                        }
                    }

                    content.push({
                        type: "image_url",
                        image_url: {
                            url: `data:image/jpeg;base64,${buffer}`,
                        }
                    });
                }
            }

            // handle images from replied message
            if (ctx.message.reply_to_message && 'photo' in ctx.message.reply_to_message && Array.isArray(ctx.message.reply_to_message.photo) && ctx.message.reply_to_message.photo.length > 0) {
                const photo = ctx.message.reply_to_message.photo.pop();
                if (photo) {
                    const file = await ctx.api.getFile(photo.file_id);
                    const fileUrl = `https://api.telegram.org/file/bot${process.env.TOKEN}/${file.file_path}`;
                    const response = await axios({
                        method: 'get',
                        url: fileUrl,
                        responseType: 'arraybuffer'
                    });
                    const buffer = Buffer.from(response.data, 'binary').toString('base64');

                    // check if model supports images
                    const modelObj = aiModels.find(ai => ai.model === model);
                    if (!modelObj || !modelObj.image) {
                        // Find an image-supporting model that user has access to
                        const fallbackModel = aiModels.find(ai =>
                            ai.image && (ctx.isPremium || !ai.premium)
                        );
                        if (fallbackModel) {
                            model = fallbackModel.model;
                        }
                    }

                    content.push({
                        type: "image_url",
                        image_url: {
                            url: `data:image/jpeg;base64,${buffer}`,
                        }
                    });
                }
            }

            // Handle different API endpoints based on provider with fallback logic
            const modelObj = aiModels.find(ai => ai.model === model);
            const provider = modelObj?.provider || "openrouter";

            let apiUrl: string;
            let headers: any;
            let requestBody: any;

            const attemptApiCall = async (currentModel: string, currentProvider: string): Promise<any> => {
                if (currentProvider === "cloudflare") {
                    if (!cloudflareApiToken || !cloudflareAccountId) {
                        throw new Error("Cloudflare API credentials not configured");
                    }

                    // Cloudflare API structure
                    apiUrl = `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/v1/chat/completions`;
                    headers = {
                        "Authorization": `Bearer ${cloudflareApiToken}`,
                        "Content-Type": "application/json"
                    };
                } else {
                    // Default to OpenRouter API
                    apiUrl = "https://openrouter.ai/api/v1/chat/completions";
                    headers = {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json"
                    };
                }

                requestBody = {
                    model: currentModel,
                    messages: [
                        {
                            role: "user",
                            content,
                        }
                    ]
                };

                return await axios.post(apiUrl, requestBody, {
                    headers,
                    timeout: 30000, // 30 second timeout
                });
            };

            let res: any;
            let finalProvider = provider;

            try {
                res = await attemptApiCall(model, provider);
            } catch (error) {
                logger.error(`Primary model ${model} failed:`, error);

                // Attempt fallback to a free model if the current model failed
                const fallbackModel = aiModels.find(ai =>
                    !ai.premium && // Must be free
                    (!content.some((c: any) => c.type === "image_url") || ai.image) // Must support images if needed
                );

                if (fallbackModel) {
                    logger.info(`Falling back to model: ${fallbackModel.model}`);
                    finalProvider = fallbackModel.provider || "openrouter";

                    try {
                        res = await attemptApiCall(fallbackModel.model, finalProvider);
                        await ctx.reply(
                            `⚠️ The model "${modelObj?.name}" is currently unavailable. I've switched to "${fallbackModel.name}" for this request.`,
                            { reply_parameters: { message_id: ctx.message.message_id } }
                        );
                    } catch (fallbackError) {
                        logger.error(`Fallback model ${fallbackModel.model} also failed:`, fallbackError);
                        throw new Error("Both primary and fallback models are currently unavailable. Please try again later.");
                    }
                } else {
                    throw error;
                }
            }

            let aiResponse: string | undefined;

            // Handle different response structures based on provider
            if (finalProvider === "cloudflare") {
                // Cloudflare API response structure
                aiResponse = res.data?.result?.response ||
                    res.data?.response ||
                    res.data?.result?.content ||
                    res.data?.content ||
                    res.data?.choices?.[0]?.message?.content; // Fallback to OpenRouter structure
            } else {
                // OpenRouter API response structure
                aiResponse = res.data?.choices?.[0]?.message?.content;
            }

            logger.info(`AI response: ${aiResponse}`);

            if (!aiResponse || typeof aiResponse !== 'string') {
                logger.error("Full response data:", JSON.stringify(res.data, null, 2));
                throw new Error("No response from AI model. The service may be temporarily unavailable.");
            }

            const parsedResponse = MarkdownParser.toPlainText(aiResponse);

            // handle long responses
            if (parsedResponse.length > 4096) {
                const chunks = Math.ceil(parsedResponse.length / 4096);
                for (let i = 0; i < chunks; i++) {
                    const index = 4096 * i;
                    await ctx.reply(parsedResponse.substring(index, index + 4096), {
                        reply_parameters: { message_id: ctx.message.message_id },
                        link_preview_options: { is_disabled: true },
                    });
                }
            } else {
                await ctx.reply(parsedResponse, {
                    reply_parameters: { message_id: ctx.message.message_id },
                    link_preview_options: { is_disabled: true },
                });
            }
        } catch (error) {
            logger.error("Error in AI processing:", error);

            let errorMessage = "Sorry, there was an error processing your request.";

            if (error instanceof Error) {
                if (error.message.includes("Both primary and fallback models are currently unavailable")) {
                    errorMessage = "🚫 Service Unavailable\n\nBoth the primary and backup AI models are currently unavailable. Please try again in a few minutes.";
                } else if (error.message.includes("No response from AI model")) {
                    errorMessage = "⏱️ No Response\n\nThe AI model didn't respond. This might be due to high server load. Please try again.";
                } else if (error.message.includes("Cloudflare API credentials not configured")) {
                    errorMessage = "⚙️ Configuration Error\n\nCloudflare API credentials are not properly configured. Please contact the bot administrator.";
                } else if (error.message.includes("timeout")) {
                    errorMessage = "⏱️ Request Timeout\n\nThe AI model took too long to respond. Please try again with a shorter message.";
                } else if (typeof error === 'object' && error && 'description' in error) {
                    errorMessage = error.description as string;
                }
            }

            await ctx.reply(errorMessage, {
                reply_parameters: { message_id: ctx.message.message_id },
            });
        }
    } else {
        const msg = ctx.t("You need to write more than that") as string;
        await ctx.reply(msg, {
            reply_parameters: { message_id: ctx.message.message_id },
        });
    }
});

export default ai;