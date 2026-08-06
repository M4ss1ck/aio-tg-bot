export type ProjectLocale = "en" | "es"

export interface ProjectTag {
    id: number
    name: string
}

export interface ProjectCoverImage {
    url: string
    alt: string
    width: number | null
    height: number | null
}

export interface ProjectSummary {
    id: number
    title: string
    description: string | null
    url: string | null
    demo: string | null
    publishedDate: string | null
    coverImage: ProjectCoverImage | null
    tags: ProjectTag[]
}

/**
 * Raw shapes as Payload REST returns them. Every field is optional and
 * nullable on purpose: this is untrusted upstream data, and the mapper is
 * the only place allowed to assume anything about it.
 */
export interface PayloadMedia {
    url?: string | null
    alt?: string | null
    width?: number | null
    height?: number | null
}

export interface PayloadTag {
    id?: number | null
    name?: string | null
}

export interface PayloadProject {
    id?: number | null
    title?: string | null
    description?: string | null
    url?: string | null
    demo?: string | null
    publishedDate?: string | null
    coverImage?: PayloadMedia | number | null
    tags?: Array<PayloadTag | number> | null
}

export interface PayloadProjectsResponse {
    docs: PayloadProject[]
    hasNextPage?: boolean | null
}
