import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import '@fontsource-variable/kode-mono'
import '@fontsource/federant'
import '../styles/globals.css'
import { Footer } from '../components/Footer'
import { TelegramInit } from '../components/TelegramInit'

export const metadata: Metadata = {
    title: 'Massick Bot v3',
    description: 'Telegram bot with NextJS app',
}

// viewportFit: 'cover' is required for env(safe-area-inset-*) to be non-zero.
export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body>
                <Script
                    src="https://telegram.org/js/telegram-web-app.js"
                    strategy="beforeInteractive"
                />
                <TelegramInit />
                <div
                    className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4"
                    style={{
                        paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)',
                        paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)',
                        paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
                        paddingRight: 'max(env(safe-area-inset-right), 1rem)',
                    }}
                >
                    <main className="flex-1">{children}</main>
                    <Footer />
                </div>
            </body>
        </html>
    )
}
