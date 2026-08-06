import type { ProjectSummary } from "./types"

/**
 * All four entries are load-bearing. The live collection contains a Telegram
 * bot tagged only `NodeJS`, `Telegram Bot`, and `Telebot`; a set limited to
 * the two framework names misfiles it under Other Projects. Tags are compared
 * trimmed and lowercased, so `grammY` and `Telegram Bot` both match.
 */
export const BOT_TAGS = new Set([
    "telegraf",
    "grammy",
    "telebot",
    "telegram bot",
])

export function isBot(project: ProjectSummary): boolean {
    return project.tags.some((tag) => BOT_TAGS.has(tag.name.trim().toLowerCase()))
}

/**
 * Partitions the already-cached collection in memory. Payload's `not_in`
 * query on a has-many relationship does not produce the correct set
 * complement, and one cached fetch beats two upstream requests.
 */
export function partitionProjects(projects: ProjectSummary[]): {
    bots: ProjectSummary[]
    others: ProjectSummary[]
} {
    return {
        bots: projects.filter(isBot),
        others: projects.filter((project) => !isBot(project)),
    }
}
