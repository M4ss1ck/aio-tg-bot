import { Composer, InlineKeyboard } from 'grammy'
import type { MyContext } from '../types'

const inline = new Composer<MyContext>()

inline.on('inline_query', async (ctx) => {
    const query = ctx.inlineQuery.query
    const response = [
        {
            title: ctx.t('Tu porcentaje de {{query}}', { query }),
            description: ctx.t('La efectividad está probada científicamente'),
            message_text: `${ctx.t('Soy')} ${Math.floor(Math.random() * 100)}% ${query}`,
        },
        {
            title: ctx.t('Probabilidad de que {{query}}', { query }),
            description: ctx.t('La efectividad está probada científicamente'),
            message_text: `${ctx.t('La probabilidad de que')} ${query} ${ctx.t('es de un')} ${Math.floor(
                Math.random() * 100,
            )}%`,
        },
    ]
    const keyboard = new InlineKeyboard()
        .switchInlineCurrent(
            ctx.t('Probar otra vez') as string,
            ctx.t('fanático de este bot') as string,
        )

    const recipes = response.map(({ title, description, message_text }) => ({
        type: 'article' as const,
        id: title as string,
        title: title as string,
        description: description as string,
        input_message_content: {
            message_text,
        },
        reply_markup: keyboard,
    }))
    return await ctx
        .answerInlineQuery(recipes, { cache_time: 5, is_personal: true })
        .catch(e => console.log('ERROR WITH INLINE QUERY\n', e))
})

export default inline
