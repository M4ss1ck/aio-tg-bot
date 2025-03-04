export const token = process.env.TOKEN ?? ''
export const domain = String(process.env.NEXT_PUBLIC_DOMAIN ?? '').replace(/^http(s)?:\/\//, "")
export const adminId = process.env.ADMIN_ID ?? ''
export const tgAPI = process.env.TG_API ?? 'https://api.telegram.org'
export const photoLimitPerUser = 20

export const projectList = [
    'calc.xdc',
    'cell-counting',
    'chain-reaction',
    'ciec-frontend-gatsby',
    'gatsby-cv-maker',
    'gatsby-gamebook',
    'massick-portfolio',
    'massick-portfolio-2',
    'nextjs-blog-template',
    'opendrift-script-generator',
]
export const botList = [
    'aio-tg-bot',
    'anime-bot',
    'bot-manager',
    'bot-monorepo',
    'dead-bots',
    'longPollRobot',
    'mention-bot',
]

export const aiModels = [
    {
        model: "deepseek/deepseek-r1-distill-llama-70b:free",
        name: "DeepSeek: R1 Distill Llama 70B",
        image: false
    },
    {
        model: "deepseek/deepseek-r1:free",
        name: "DeepSeek: R1",
        image: false
    },
    {
        model: "google/gemini-2.0-flash-thinking-exp:free",
        name: "Gemini 2.0 Flash Thinking Experimental 01-21",
        image: true
    },
    {
        model: "google/gemini-2.0-pro-exp-02-05:free",
        name: "Gemini Pro 2.0 Experimental",
        image: true
    },
    {
        model: "qwen/qwen2.5-vl-72b-instruct:free",
        name: "Qwen2.5 VL 72B Instruct",
        image: true
    }
]