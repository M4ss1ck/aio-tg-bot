import { Composer } from "telegraf";
import axios from "axios";

import MarkdownParser from "../../utils/markdownParser";

const ai = new Composer();
const apiKey = process.env.OPENROUTER_API_KEY;

ai.command(["ai", "ia"], async (ctx) => {
    if (!apiKey) {
        await ctx.reply("API key not set. Please contact the bot owner.");
        return;
    }

    // const model = "deepseek/deepseek-r1:free";
    const model = "deepseek/deepseek-r1-distill-llama-70b:free";

    const search = ctx.message.text.replace(/^\/(ai|ia)((@\w+)?\s+)?/i, "");
    const sanitizedInput = encodeURIComponent(search);
    if (search.length > 2) {
        try {
            const res = await axios.post("https://openrouter.ai/api/v1/chat/completions",
                {
                    model,
                    messages: [
                        {
                            role: "user",
                            content: sanitizedInput
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
            const msg = typeof error === 'object' && error && 'description' in error ? error.description as string : "Sorry, there was an error processing your request."
            await ctx.reply(msg, {
                reply_to_message_id: ctx.message.message_id,
            });
        }
    } else {
        await ctx.reply("You need to write more than that", {
            reply_to_message_id: ctx.message.message_id,
        });
    }
});

export default ai;