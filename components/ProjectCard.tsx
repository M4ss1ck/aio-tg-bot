import Image from "next/image"
import type { ProjectSummary } from "../utils/portfolio"
import { Pill } from "./Pill"

const FALLBACK_COVER = "/images/clean.png"

function formatPublishedDate(
    publishedDate: string | null,
    locale: string,
): string | null {
    if (publishedDate === null) return null
    const parsed = new Date(publishedDate)
    if (Number.isNaN(parsed.getTime())) return null
    return new Intl.DateTimeFormat(locale, {
        month: "long",
        year: "numeric",
    }).format(parsed)
}

export const ProjectCard = ({
    project,
    locale,
}: {
    project: ProjectSummary
    locale: string
}) => {
    const coverUrl = project.coverImage?.url ?? FALLBACK_COVER
    const coverAlt = project.coverImage?.alt ?? project.title
    const publishedLabel = formatPublishedDate(project.publishedDate, locale)

    return (
        <article className="animate-rise overflow-hidden rounded-2xl border border-white/15 bg-surface">
            <div className="relative h-40 w-full">
                <Image
                    src={coverUrl}
                    alt={coverAlt}
                    fill
                    sizes="(max-width: 512px) 100vw, 512px"
                    className="object-cover"
                />
            </div>
            <div className="space-y-3 p-4 backdrop-blur-md">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h2 className="font-display text-xl text-other">
                        {project.title}
                    </h2>
                    {publishedLabel ? (
                        <p className="font-display text-xs text-foreground/70">
                            {publishedLabel}
                        </p>
                    ) : null}
                </div>

                {project.tags.length > 0 ? (
                    <ul className="flex flex-wrap gap-2">
                        {project.tags.map((tag) => (
                            <li key={tag.id}>
                                <Pill>{tag.name}</Pill>
                            </li>
                        ))}
                    </ul>
                ) : null}

                {project.description ? (
                    <p className="text-sm leading-relaxed text-foreground/90">
                        {project.description}
                    </p>
                ) : null}

                {project.url || project.demo ? (
                    <div className="flex flex-wrap gap-3 pt-1">
                        {project.url ? (
                            <a
                                href={project.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-11 items-center rounded-lg border border-primary px-4 font-display text-sm text-primary"
                            >
                                Source
                            </a>
                        ) : null}
                        {project.demo ? (
                            <a
                                href={project.demo}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-11 items-center rounded-lg border border-secondary bg-secondary/20 px-4 font-display text-sm text-foreground"
                            >
                                Demo
                            </a>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </article>
    )
}
