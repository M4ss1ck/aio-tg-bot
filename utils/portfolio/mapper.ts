import type {
    PayloadMedia,
    PayloadProject,
    PayloadProjectsResponse,
    ProjectCoverImage,
    ProjectSummary,
    ProjectTag,
} from "./types"

/**
 * Payload returns media URLs relative to the portfolio origin
 * (`/api/media/file/x.png`). Resolve against the configured base URL.
 * Never build a media URL from `filename`.
 */
export function resolveMediaUrl(rawUrl: string, baseUrl: string): string {
    return new URL(rawUrl, baseUrl).toString()
}

function optionalString(value: unknown): string | null {
    if (typeof value !== "string") return null
    const trimmed = value.trim()
    return trimmed.length > 0 ? value : null
}

function optionalNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null
}

function mapCoverImage(
    raw: PayloadProject["coverImage"],
    baseUrl: string,
    title: string,
): ProjectCoverImage | null {
    if (typeof raw !== "object" || raw === null) return null
    const media = raw as PayloadMedia
    const url = optionalString(media.url)
    if (url === null) return null
    return {
        url: resolveMediaUrl(url, baseUrl),
        alt: optionalString(media.alt) ?? title,
        width: optionalNumber(media.width),
        height: optionalNumber(media.height),
    }
}

function mapTags(raw: PayloadProject["tags"]): ProjectTag[] {
    if (!Array.isArray(raw)) return []
    const tags: ProjectTag[] = []
    for (const entry of raw) {
        if (typeof entry !== "object" || entry === null) continue
        const id = optionalNumber(entry.id)
        const name = optionalString(entry.name)
        if (id === null || name === null) continue
        tags.push({ id, name })
    }
    return tags
}

export function mapProject(
    raw: PayloadProject,
    baseUrl: string,
): ProjectSummary | null {
    const id = optionalNumber(raw.id)
    const title = optionalString(raw.title)
    if (id === null || title === null) return null

    return {
        id,
        title,
        description: optionalString(raw.description),
        url: optionalString(raw.url),
        demo: optionalString(raw.demo),
        publishedDate: optionalString(raw.publishedDate),
        coverImage: mapCoverImage(raw.coverImage, baseUrl, title),
        tags: mapTags(raw.tags),
    }
}

/**
 * Payload returns the undated project FIRST under `sort=-publishedDate`,
 * because Postgres orders nulls first on a descending sort. Re-sort here so
 * list order is stable and undated projects fall to the end.
 */
export function orderProjects(projects: ProjectSummary[]): ProjectSummary[] {
    const dated = projects.filter((project) => project.publishedDate !== null)
    const undated = projects.filter((project) => project.publishedDate === null)
    dated.sort(
        (a, b) =>
            Date.parse(b.publishedDate as string) -
            Date.parse(a.publishedDate as string),
    )
    return [...dated, ...undated]
}

export function isPayloadProjectsResponse(
    value: unknown,
): value is PayloadProjectsResponse {
    if (typeof value !== "object" || value === null) return false
    const docs = (value as { docs?: unknown }).docs
    return Array.isArray(docs)
        && docs.every((doc) => typeof doc === "object" && doc !== null && !Array.isArray(doc))
}
