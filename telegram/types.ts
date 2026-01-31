import type { Context, SessionFlavor } from 'grammy'
import type { HydrateFlavor } from '@grammyjs/hydrate'
import type { ParseModeFlavor } from '@grammyjs/parse-mode'
import type { i18n, TFunction } from 'i18next'

export interface SessionData {
    lang: string
}

export interface CustomContextProps {
    i18next: i18n
    t: TFunction
    model?: string
    isPremium?: boolean
}

export type MyContext = HydrateFlavor<
    ParseModeFlavor<Context & SessionFlavor<SessionData> & CustomContextProps>
>
