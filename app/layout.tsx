import type { Metadata } from 'next'
import Script from 'next/script';
import '../styles/globals.css'
import { Footer } from '../components/Footer';

export const metadata: Metadata = {
    title: 'Massick Bot v3',
    description: 'Telegram bot with NextJS app',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html>
            <body className="bg-telegram-bg text-telegram-text">
                {children}
                <Footer />
                <Script
                    src="https://telegram.org/js/telegram-web-app.js"
                    strategy="beforeInteractive"
                />
            </body>
        </html>
    )
}