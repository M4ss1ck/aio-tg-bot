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
        model: "deepseek/deepseek-r1-0528-qwen3-8b:free",
        name: "DeepSeek: Deepseek R1 0528 Qwen3 8B",
        image: false
    },
    {
        model: "deepseek/deepseek-r1-0528:free",
        name: "DeepSeek: R1 0528",
        image: false
    },
    {
        model: "google/gemma-3n-e4b-it:free",
        name: "Google: Gemma 3n 4B",
        image: true
    },
    {
        model: "qwen/qwen3-30b-a3b:free",
        name: "Qwen: Qwen3 30B A3B",
        image: true
    },
]