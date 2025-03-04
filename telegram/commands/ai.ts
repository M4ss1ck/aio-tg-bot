import { Composer, Markup } from "telegraf";
import axios from "axios";

import MarkdownParser from "../../utils/markdownParser";
import { logger } from "../../utils/logger";
import type { MyContext } from "../interfaces";
import { updateUser } from "../global/data";
import { aiModels } from "../../config/constants";

const ai = new Composer<MyContext>();
const apiKey = process.env.OPENROUTER_API_KEY;


ai.use(async (ctx, next) => {
    try {
        if (
            ctx.from?.id
        ) {
            const userObjFromGlobal = global.USUARIOS[ctx.from.id.toString()]
            const userModel = userObjFromGlobal?.model ?? aiModels[0].model
            ctx.model = userModel
        }
    } catch (error) {
        logger.info('Error in AI middleware')
        logger.error(error)
    }
    return next()
})

ai.command("ai_model", async (ctx) => {
    const text = `Select your AI model:\n${aiModels.map(model => `- ${model.name} (${model.model})`).join('\n')}`
    await ctx.reply(text,
        Markup.inlineKeyboard(
            aiModels.map((model, index) => [Markup.button.callback(model.name, `set_model_${index}`)])
        )
    )
})

ai.action(/set_model_(\d+)/i, async ctx => {
    if ('data' in ctx.callbackQuery && ctx.from?.id) {
        await ctx.answerCbQuery().catch(e => logger.error(e))
        const [, indexString] = ctx.callbackQuery.data.match(/set_model_(\d+)/i) || [null, '1']
        const index = parseInt(indexString ?? '1')
        const model = aiModels[index].model
        await updateUser({ ...global.USUARIOS[ctx.from.id.toString()], model })
        await ctx.reply(`Your AI model has been set to ${model}`)
    }
})


ai.command(["ai", "ia"], async (ctx) => {
    if (!apiKey) {
        await ctx.reply(ctx.t("API key not set. Please contact the bot owner") as string);
        return;
    }

    let model = ctx.model ?? aiModels[0].model;

    let search = ctx.message.text.replace(/^\/(ai|ia)((@\w+)?\s+)?/i, "");
    let includeImage = ctx.message.reply_to_message && 'photo' in ctx.message.reply_to_message;

    // append replied-to message content
    if (ctx.message.reply_to_message) {
        if ('text' in ctx.message.reply_to_message) {
            search += "\n" + ctx.message.reply_to_message.text;
        }
        else if ('caption' in ctx.message.reply_to_message) {
            search += "\n" + ctx.message.reply_to_message.caption;
        }
    }
    const sanitizedInput = encodeURIComponent(search);
    if (sanitizedInput.length > 2) {
        try {
            let content: any = sanitizedInput;
            // handle images
            if (includeImage && ctx.message.reply_to_message && 'photo' in ctx.message.reply_to_message) {
                const photo = ctx.message.reply_to_message.photo.pop()
                if (photo) {
                    const link = await ctx.telegram.getFileLink(photo.file_id)
                    if (link.href) {
                        // check if model supports images
                        const modelObj = aiModels.find(ai => ai.model === model)
                        if (!modelObj || !modelObj.image) {
                            model = aiModels.find(ai => ai.image)?.model ?? aiModels[0].model
                        }

                        // refactor content
                        content = [
                            {
                                type: "text",
                                text: sanitizedInput
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: link.href,
                                }
                            }
                        ]
                    }
                }

            }

            const res = await axios.post("https://openrouter.ai/api/v1/chat/completions",
                {
                    model,
                    messages: [
                        {
                            role: "user",
                            content,
                        }
                    ]
                },
                {
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            const aiResponse = res.data.choices[0].message.content;
            logger.info(`AI response: ${aiResponse}`);
            if (!aiResponse) throw new Error("No response from AI (Timeout?)");

            const parsedResponse = MarkdownParser.toPlainText(aiResponse);

            // handle long responses
            if (parsedResponse.length > 4096) {
                const chunks = Math.ceil(parsedResponse.length / 4096)
                for (let i = 0; i < chunks; i++) {
                    const index = 4096 * i
                    await ctx.reply(parsedResponse.substring(index, index + 4096), {
                        reply_to_message_id: ctx.message.message_id,
                        disable_web_page_preview: true,
                    })
                }
            } else {
                await ctx.reply(parsedResponse, {
                    reply_to_message_id: ctx.message.message_id,
                    disable_web_page_preview: true,
                });
            }
        } catch (error) {
            console.error("Error calling OpenRouter API:", error);
            const msg = typeof error === 'object' && error && 'description' in error ? error.description as string : ctx.t("Sorry, there was an error processing your request.")
            await ctx.reply(msg, {
                reply_to_message_id: ctx.message.message_id,
            });
        }
    } else {
        const msg = ctx.t("You need to write more than that")
        await ctx.reply(msg, {
            reply_to_message_id: ctx.message.message_id,
        });
    }
});

export default ai;