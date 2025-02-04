import { Composer } from "telegraf";
import axios from "axios";

const ai = new Composer();
const apiKey = process.env.OPENROUTER_API_KEY;

ai.command(["ai", "ia"], async (ctx) => {
    if (!apiKey) {
        await ctx.reply("API key not set. Please contact the bot owner.");
        return;
    }
    const search = ctx.message.text.replace(/^\/(ai|ia)((@\w+)?\s+)?/i, "");
    if (search.length > 2) {
        try {
            const res = await axios.post("https://openrouter.ai/api/v1/chat/completions",
                {
                    model: "deepseek/deepseek-r1:free",
                    messages: [
                        {
                            role: "user",
                            content: search
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
            await ctx.reply(aiResponse);

        } catch (error) {
            console.error("Error calling OpenRouter API:", error);
            const msg = typeof error === 'object' && error && 'description' in error ? error.description as string : "Sorry, there was an error processing your request."
            await ctx.reply(msg);
        }
    } else {
        await ctx.reply("You need to write more than that");
    }
});

export default ai;