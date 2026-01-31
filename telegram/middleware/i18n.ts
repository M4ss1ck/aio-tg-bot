import { Composer } from 'grammy'
import type { MyContext } from '../types'
import { i18n as i18next } from '../locales/i18n'
import { updateUser } from '../global/data'

const i18n = new Composer<MyContext>()

i18n.use(async (ctx, next) => {
    try {
        if (ctx.from?.id) {
            const userObjFromGlobal = global.USUARIOS[ctx.from.id.toString()]
            const userLocale = userObjFromGlobal?.lang ?? ctx.session?.lang ?? ctx.from.language_code ?? 'en'
            const _i18next = i18next.cloneInstance({ initImmediate: false, lng: userLocale })
            ctx.session.lang = userLocale
            _i18next.on('languageChanged', async (lng) => {
                ctx.session.lang = lng
                await updateUser({ ...userObjFromGlobal, lang: lng })
            })
            ctx.i18next = _i18next
            ctx.t = _i18next.t.bind(_i18next)
        } else {
            // Fallback for contexts without a user (e.g., inline queries without from)
            ctx.t = i18next.t.bind(i18next)
            ctx.i18next = i18next
        }
    } catch (error) {
        console.log('Error in i18n middleware')
        console.log(error)
        // Provide fallback even on error
        ctx.t = i18next.t.bind(i18next)
        ctx.i18next = i18next
    }
    return next()
})

i18n.command(['changeLanguage', 'cl'], async (ctx) => {
    const language = ctx.session.lang === 'en' ? 'es' : 'en'
    ctx.i18next.changeLanguage(language)
    return ctx.reply(ctx.t('changeLanguage') as string)
})

i18n.callbackQuery('changeLanguage', async (ctx) => {
    const language = ctx.session.lang === 'en' ? 'es' : 'en'
    ctx.i18next.changeLanguage(language)
    return ctx.answerCallbackQuery({ text: ctx.t('changeLanguage') as string })
})

export default i18n
