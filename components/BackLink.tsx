"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

/**
 * Telegram's native BackButton plus an always-present in-page fallback,
 * so the control works in Telegram, in a normal browser, and for
 * assistive technology.
 */
export const BackLink = () => {
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        const backButton = window.Telegram?.WebApp?.BackButton
        if (!backButton || pathname === "/") return

        const handleBack = () => router.push("/")
        backButton.show()
        backButton.onClick(handleBack)

        return () => {
            backButton.offClick(handleBack)
            backButton.hide()
        }
    }, [pathname, router])

    if (pathname === "/") return null

    return (
        <Link
            href="/"
            className="inline-flex min-h-11 items-center font-display text-sm text-primary underline"
        >
            Back to start
        </Link>
    )
}
