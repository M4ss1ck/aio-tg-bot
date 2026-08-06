'use client'
import { useState, useEffect } from 'react'
import { Back } from './Back'
import { PageHeading } from './PageHeading'
import { StateMessage } from './StateMessage'

export const UserInfo = () => {
    const [userData, setUserData] = useState<string>('')

    useEffect(() => {
        const raw = window.Telegram?.WebApp?.initData
        if (!raw) return

        for (const pair of decodeURIComponent(raw).split('&')) {
            const [key, ...rest] = pair.split('=')
            if (key === 'user') {
                setUserData(rest.join('='))
                return
            }
        }
    }, [])

    return (
        <section className="flex flex-col items-center gap-4 py-6">
            <PageHeading>Your Data</PageHeading>

            {userData ? (
                <pre className="w-full overflow-x-auto rounded-2xl border border-white/15 bg-surface p-4 font-display text-xs text-foreground/90 backdrop-blur-md">
                    {JSON.stringify(JSON.parse(userData), null, 2)}
                </pre>
            ) : (
                <StateMessage
                    title="No Telegram data"
                    body="Open this page inside Telegram to see the data it shares with this bot."
                />
            )}

            <Back />
        </section>
    )
}
