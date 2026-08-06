"use client"
import { useEffect } from "react"

/**
 * Initializes the Telegram WebApp exactly once. Outside Telegram
 * (local development in a normal browser) window.Telegram is absent and
 * this is a no-op.
 */
export const TelegramInit = () => {
    useEffect(() => {
        const webApp = window.Telegram?.WebApp
        if (!webApp) return
        webApp.ready()
        webApp.expand()
    }, [])

    return null
}
