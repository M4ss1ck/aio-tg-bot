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