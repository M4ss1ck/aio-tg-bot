import type { ProjectLocale } from "./types"

interface LanguageEntry {
    tag: string
    quality: number
}

function parseAcceptLanguage(header: string): LanguageEntry[] {
    return header
        .split(",")
        .map((part) => {
            const [rawTag, ...parameters] = part.split(";")
            const qualityParameter = parameters
                .map((parameter) => parameter.trim())
                .find((parameter) => parameter.startsWith("q="))
            const parsed = qualityParameter
                ? Number.parseFloat(qualityParameter.slice(2))
                : 1
            return {
                tag: rawTag.trim().toLowerCase(),
                quality: Number.isFinite(parsed) ? parsed : 0,
            }
        })
        .filter((entry) => entry.tag.length > 0 && entry.quality > 0)
        .sort((a, b) => b.quality - a.quality)
}

/**
 * Resolves the CMS locale from the request's Accept-Language header.
 * Spanish wins; everything else, including an absent or unparseable header,
 * falls back to English (which is also Payload's fallback locale).
 */
export function resolveLocale(
    acceptLanguage: string | null | undefined,
): ProjectLocale {
    for (const entry of parseAcceptLanguage(String(acceptLanguage ?? ""))) {
        if (entry.tag === "es" || entry.tag.startsWith("es-")) return "es"
        if (entry.tag === "en" || entry.tag.startsWith("en-")) return "en"
    }
    return "en"
}
