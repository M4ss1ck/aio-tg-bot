import { Composer, InlineKeyboard } from 'grammy'
import { search } from 'urban-dictionary-client'
import type { MyContext } from '../types'
import { prisma } from '../../db/prisma'
import { saveResultsInDB } from '../global/data'

const urban = new Composer<MyContext>()

const escape = (s: string) => s.replace(/\[|\]|<|>/g, '')

type UrbanDefinition = {
    definition: string
    example?: string
}

type UrbanSearchResponse = {
    list: UrbanDefinition[]
}

function isUrbanDefinition(value: unknown): value is UrbanDefinition {
    if (typeof value !== 'object' || value === null) return false
    const definition = (value as { definition?: unknown }).definition
    return typeof definition === 'string'
}

function parseStoredResults(value: string): UrbanDefinition[] {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter(isUrbanDefinition) : []
}

// Urban Dictionary
urban.command('ud', async (ctx) => {
    const query = ctx.message?.text?.substring(4) ?? ''
    try {
        let results = await prisma.dictionary.findUnique({
            where: {
                query
            }
        }).then(dict => dict ? parseStoredResults(dict.response) : []).catch((error: unknown) => {
            console.log(error)
            return []
        })
        if (!results || results.length === 0) {
            results = await search(query).then(async (res: UrbanSearchResponse) => {
                await saveResultsInDB(res.list, query)
                return res.list
            }).catch((error: unknown) => {
                console.log(error)
                return []
            })
        }
        if (!results || results.length === 0) {
            return ctx.reply(ctx.t('No results found!')!).catch(console.error)
        }
        const lastPage = results.length - 1 || 1
        const current = results[0]
        let text = `<b>${ctx.t('Results for')} <i>"${query}"</i>:</b>`
        let displayFullDefinition = true
        let displayFullExamples = true
        if (text.length + current.definition.length > 2035) {
            displayFullDefinition = false
            displayFullExamples = false
        } else if (text.length + current.definition.length + (current.example?.length ?? 0) > 2035) {
            displayFullExamples = false
        }

        text += `\n\n${displayFullDefinition ? escape(current.definition) : escape(current.definition).substring(0, 2035 - text.length)}\n<i>${displayFullDefinition && displayFullExamples ? escape(current.example ? current.example : 'No example found').substring(0, 2035 - current.definition.length - text.length) : ""}</i>`

        const keyboard = new InlineKeyboard()
            .text('<<', 'ud_na')
            .text('<', 'ud_na')
            .text(`1/${lastPage + 1}`, 'ud_na')
            .text('>', `ud_1_${query.substring(0, 59)}`)
            .text('>>', `ud_${lastPage}_${query.substring(0, 58)}`)

        ctx.reply(text, { reply_markup: keyboard }).catch(console.error)
    }
    catch (error) {
        console.log(error)
    }
})

urban.callbackQuery('ud_na', async ctx => {
    if ('data' in ctx.callbackQuery) {
        try {
            ctx.answerCallbackQuery({ text: ctx.t('This action is not available') as string })
        } catch (error) {
            console.log(error)
        }
    }
})

urban.callbackQuery(/^ud_(\d+)_(.+)/i, async ctx => {
    if ('data' in ctx.callbackQuery) {
        const [, pageString, query] = ctx.callbackQuery.data.match(/ud_(\d+)_(.+)/i) || [null, '1', '']
        const page = parseInt(pageString ?? '1')
        if (typeof page === 'number' && query) {
            let results = await prisma.dictionary.findUnique({
                where: {
                    query
                }
            }).then(dict => dict ? parseStoredResults(dict.response) : []).catch((error: unknown) => {
                console.log(error)
                return []
            })
            if (!results || results.length === 0) {
                results = await search(query).then(async (res: UrbanSearchResponse) => {
                    await saveResultsInDB(res.list, query)
                    return res.list
                }).catch((error: unknown) => {
                    console.log(error)
                    return []
                })
            }
            if (results && results[page]) {
                const current = results[page]
                const lastPage = results.length - 1 || 1
                let text = `<b>${ctx.t('Results for')} <i>"${query}"</i>:</b>`
                let displayFullDefinition = true
                let displayFullExamples = true
                if (text.length + current.definition.length > 2035) {
                    displayFullDefinition = false
                    displayFullExamples = false
                } else if (text.length + current.definition.length + (current.example?.length ?? 0) > 2035) {
                    displayFullExamples = false
                }

                text += `\n\n${displayFullDefinition ? escape(current.definition) : escape(current.definition).substring(0, 2035 - text.length)}\n<i>${displayFullDefinition && displayFullExamples ? escape(current.example ? current.example : 'No example found').substring(0, 2035 - current.definition.length - text.length) : ""}</i>`

                const keyboard = new InlineKeyboard()
                    .text('<<', page < 1 ? 'ud_na' : `ud_0_${query.substring(0, 59)}`)
                    .text('<', page < 1 ? 'ud_na' : `ud_${page - 1}_${query.substring(0, 58)}`)
                    .text(`${page + 1}/${lastPage + 1}`, 'ud_na')
                    .text('>', lastPage > page ? `ud_${page + 1}_${query.substring(0, 59)}` : 'ud_na')
                    .text('>>', lastPage > page ? `ud_${lastPage}_${query.substring(0, 58)}` : 'ud_na')

                ctx.editMessageText(text, { reply_markup: keyboard, parse_mode: 'HTML' })
            }
        }
    }
})

export default urban
