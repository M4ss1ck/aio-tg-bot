import { headers } from "next/headers"
import { logger } from "../utils/logger"
import {
    getProjects,
    partitionProjects,
    resolveLocale,
    type ProjectSummary,
} from "../utils/portfolio"
import { ProjectCard } from "./ProjectCard"
import { StateMessage } from "./StateMessage"

const EMPTY_COPY = {
    bots: "No bots are published yet. Check back soon.",
    others: "No other projects are published yet. Check back soon.",
} as const

/**
 * The only caller of getProjects. Both /bots and /projects render through
 * this component, so they share one fetch, one cache entry, one error path,
 * and one empty state.
 *
 * Reading headers() makes the host route dynamic on purpose: it keeps the
 * portfolio API out of the Docker build while the shared Data Cache entry
 * still serves every visitor.
 */
export async function ProjectSection({ kind }: { kind: "bots" | "others" }) {
    const requestHeaders = await headers()
    const locale = resolveLocale(requestHeaders.get("accept-language"))

    let projects: ProjectSummary[]
    try {
        projects = await getProjects(locale)
    } catch (error) {
        logger.error(
            "Failed to load portfolio projects:",
            error instanceof Error ? error.message : error,
        )
        return (
            <StateMessage
                title="Projects are unavailable"
                body="We could not reach the project list right now. Please try again in a moment."
            />
        )
    }

    const partition = partitionProjects(projects)
    const selected = kind === "bots" ? partition.bots : partition.others

    if (selected.length === 0) {
        return <StateMessage title="Nothing here yet" body={EMPTY_COPY[kind]} />
    }

    return (
        <div className="flex flex-col gap-6">
            {selected.map((project) => (
                <ProjectCard key={project.id} project={project} locale={locale} />
            ))}
        </div>
    )
}
