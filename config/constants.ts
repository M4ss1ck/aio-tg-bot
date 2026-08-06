export const token = process.env.TOKEN ?? ''
export const domain = String(process.env.NEXT_PUBLIC_DOMAIN ?? '').replace(/^http(s)?:\/\//, "")
export const adminId = process.env.ADMIN_ID ?? ''
export const tgAPI = process.env.TG_API ?? 'https://api.telegram.org'
export const photoLimitPerUser = 20

export const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN
export const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID

export const aiModels = [
    {
        model: "qwen/qwen2.5-vl-72b-instruct:free",
        name: "Qwen2.5 VL 72B Instruct",
        image: true,
        premium: false,
        provider: "openrouter"
    },
    {
        model: "deepseek/deepseek-r1-distill-llama-70b:free",
        name: "DeepSeek: R1 Distill Llama 70B",
        image: false,
        premium: false,
        provider: "openrouter"
    },
    {
        model: "deepseek/deepseek-r1:free",
        name: "DeepSeek: R1",
        image: false,
        premium: false,
        provider: "openrouter"
    },
    {
        model: "@cf/meta/llama-4-scout-17b-16e-instruct",
        name: "Cloudflare Llama 4 Scout 17B 16E Instruct",
        image: false,
        premium: true,
        provider: "cloudflare"
    },
    {
        model: "@cf/qwen/qwq-32b",
        name: "Cloudflare Qwen 32B",
        image: false,
        premium: true,
        provider: "cloudflare"
    },
    {
        model: "@cf/mistralai/mistral-small-3.1-24b-instruct",
        name: "Cloudflare Mistral Small 3.1 24B Instruct",
        image: false,
        premium: true,
        provider: "cloudflare"
    },
    {
        model: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
        name: "Cloudflare DeepSeek R1 Distill Qwen 32B",
        image: false,
        premium: true,
        provider: "cloudflare"
    }
]
