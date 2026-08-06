import assert from "node:assert/strict"
import { test } from "node:test"
import { isBot, partitionProjects } from "./classify"
import type { ProjectSummary, ProjectTag } from "./types"

function project(id: number, tagNames: string[]): ProjectSummary {
    const tags: ProjectTag[] = tagNames.map((name, index) => ({
        id: id * 100 + index,
        name,
    }))
    return {
        id,
        title: `project-${id}`,
        description: null,
        url: null,
        demo: null,
        publishedDate: null,
        coverImage: null,
        tags,
    }
}

test("isBot matches every bot tag regardless of case or padding", () => {
    assert.equal(isBot(project(1, ["Telegraf"])), true)
    assert.equal(isBot(project(2, ["grammY"])), true)
    assert.equal(isBot(project(3, ["Telebot"])), true)
    assert.equal(isBot(project(4, ["Telegram Bot"])), true)
    assert.equal(isBot(project(5, ["  TELEGRAM BOT  "])), true)
})

test("isBot keeps a project with extra non-bot tags under bots", () => {
    assert.equal(
        isBot(project(6, ["TypeScript", "Bun", "grammY", "elysia", "prisma"])),
        true,
    )
})

test("isBot classifies a Telegram bot tagged only Telebot and Telegram Bot", () => {
    // Mirrors the live `WastingBot` document. A set limited to telegraf and
    // grammy misfiles this project under Other Projects.
    assert.equal(isBot(project(7, ["NodeJS", "Telegram Bot", "Telebot"])), true)
})

test("isBot rejects non-bot projects", () => {
    assert.equal(isBot(project(8, ["React", "Vite", "TypeScript"])), false)
    assert.equal(isBot(project(9, [])), false)
    assert.equal(isBot(project(10, ["DeltaChat", "webxdc", "Game"])), false)
})

test("partitionProjects splits every project exactly once and keeps order", () => {
    const projects = [
        project(1, ["Telegraf"]),
        project(2, ["React"]),
        project(3, ["NodeJS", "Telegram Bot", "Telebot"]),
        project(4, ["Gatsby"]),
    ]

    const { bots, others } = partitionProjects(projects)

    assert.deepEqual(bots.map((p) => p.id), [1, 3])
    assert.deepEqual(others.map((p) => p.id), [2, 4])
    assert.equal(bots.length + others.length, projects.length)

    const seen = [...bots, ...others].map((p) => p.id).sort()
    assert.deepEqual(seen, [1, 2, 3, 4])
})
