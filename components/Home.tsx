"use client"
import { useState, useEffect } from 'react'
import { HomeCards } from './HomeCards'
import LettersAnimation from './LettersAnimation'

type LoginStatus = 'pending' | 'in-telegram' | 'outside-telegram'

function readTelegramName(): string | null {
    const raw = window.Telegram?.WebApp?.initData
    if (!raw) return null

    for (const pair of decodeURIComponent(raw).split('&')) {
        const [key, ...rest] = pair.split('=')
        if (key !== 'user') continue
        try {
            const user = JSON.parse(rest.join('='))
            if (typeof user?.first_name !== 'string') return null
            return typeof user.last_name === 'string'
                ? `${user.first_name} ${user.last_name}`
                : user.first_name
        } catch {
            return null
        }
    }
    return null
}

export default function Home() {
    const [status, setStatus] = useState<LoginStatus>('pending')
    const [name, setName] = useState<string | null>(null)

    useEffect(() => {
        const telegramName = readTelegramName()
        if (window.Telegram?.WebApp?.initData) {
            setName(telegramName)
            setStatus('in-telegram')
        } else {
            setStatus('outside-telegram')
        }
    }, [])

    return (
        <div className="flex flex-col gap-6 py-6">
            <header className="flex flex-col items-center gap-2 text-center">
                <p className="font-display text-xs uppercase tracking-[0.3em] text-foreground/60">
                    Massick Bot
                </p>
                {name ? (
                    <LettersAnimation title={`Welcome, ${name}`} />
                ) : (
                    <LettersAnimation title="Welcome" />
                )}
                {status === 'outside-telegram' ? (
                    <p className="rounded-lg border border-secondary/60 bg-secondary/20 px-3 py-2 text-sm text-foreground/90">
                        Open this page inside Telegram for the full experience.
                    </p>
                ) : null}
            </header>

            <HomeCards />
        </div>
    )
}
