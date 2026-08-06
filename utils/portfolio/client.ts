import { isPayloadProjectsResponse, mapProject, orderProjects } from "./mapper"
import type { ProjectLocale, ProjectSummary } from "./types"

const SELECT_FIELDS = [
    "title",
    "description",
    "url",
    "demo",
    "publishedDate",
    "coverImage",
    "tags",
] as const

const PAGE_LIMIT = 100
const REVALIDATE_SECONDS = 1800
const CACHE_TAG = "portfolio-projects"
/** Guards against an infinite server-render loop if upstream always reports another page. */
const MAX_PAGES = 20

export class ProjectsUnavailableError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "ProjectsUnavailableError"
    }
}

export function getPortfolioBaseUrl(): string {
    const raw = String(process.env.PORTFOLIO_API_URL ?? "").trim()
    if (raw.length === 0) {
        throw new ProjectsUnavailableError("PORTFOLIO_API_URL is not configured")
    }
    return raw.replace(/\/+$/, "")
}

export function buildProjectsUrl(
    baseUrl: string,
    locale: ProjectLocale,
    page: number,
): string {
    const params = new URLSearchParams()
    params.set("depth", "1")
    params.set("locale", locale)
    params.set("fallback-locale", "en")
    params.set("sort", "-publishedDate")
    params.set("limit", String(PAGE_LIMIT))
    params.set("page", String(page))
    // Mandatory: without selection Payload returns the full Lexical `content`
    // tree and populated `relatedProjects`, neither of which this app renders.
    for (const field of SELECT_FIELDS) {
        params.set(`select[${field}]`, "true")
    }
    return `${baseUrl}/api/projects?${params.toString()}`
}

/**
 * The single entry point for project data. Server-only: it reads
 * PORTFOLIO_API_URL, which is never exposed to the browser.
 *
 * Next's Data Cache is the only cache. It keys on the request URL, which
 * separates locales and pages for free, shares one response across /bots,
 * /projects and all visitors, and serves stale data when a background
 * revalidation fails.
 *
 * Error messages deliberately omit the request URL so logs never leak
 * internal endpoints.
 */
export async function getProjects(
    locale: ProjectLocale,
): Promise<ProjectSummary[]> {
    const baseUrl = getPortfolioBaseUrl()
    const collected: ProjectSummary[] = []

    for (let page = 1; page <= MAX_PAGES; page += 1) {
        const response = await fetch(buildProjectsUrl(baseUrl, locale, page), {
            next: {
                revalidate: REVALIDATE_SECONDS,
                tags: [CACHE_TAG],
            },
        })

        if (!response.ok) {
            throw new ProjectsUnavailableError(
                `Portfolio API returned ${response.status} for locale ${locale} page ${page}`,
            )
        }

        let body: unknown
        try {
            body = await response.json()
        } catch {
            throw new ProjectsUnavailableError(
                `Portfolio API returned a non-JSON body for locale ${locale} page ${page}`,
            )
        }

        if (!isPayloadProjectsResponse(body)) {
            throw new ProjectsUnavailableError(
                `Portfolio API returned an unexpected shape for locale ${locale} page ${page}`,
            )
        }

        for (const raw of body.docs) {
            const project = mapProject(raw, baseUrl)
            if (project !== null) collected.push(project)
        }

        if (body.hasNextPage !== true) break
    }

    return orderProjects(collected)
}
