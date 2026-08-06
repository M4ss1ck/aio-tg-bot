import assert from "node:assert/strict"
import { test } from "node:test"
import { buildProjectsUrl, getProjects, ProjectsUnavailableError } from "./client"

const BASE = "https://www.massick.dev"

function payloadPage(
    docs: Array<Record<string, unknown>>,
    hasNextPage: boolean,
): Response {
    return new Response(JSON.stringify({ docs, hasNextPage }), {
        status: 200,
        headers: { "content-type": "application/json" },
    })
}

function withStubbedFetch(
    handler: (url: string) => Response,
    run: () => Promise<void>,
): Promise<void> {
    const original = globalThis.fetch
    globalThis.fetch = (async (input: string | URL | Request) =>
        handler(String(input))) as typeof fetch
    return run().finally(() => {
        globalThis.fetch = original
    })
}

test("buildProjectsUrl sets every required Payload query parameter", () => {
    const url = new URL(buildProjectsUrl(BASE, "es", 2))

    assert.equal(url.origin + url.pathname, "https://www.massick.dev/api/projects")
    assert.equal(url.searchParams.get("depth"), "1")
    assert.equal(url.searchParams.get("locale"), "es")
    assert.equal(url.searchParams.get("fallback-locale"), "en")
    assert.equal(url.searchParams.get("sort"), "-publishedDate")
    assert.equal(url.searchParams.get("limit"), "100")
    assert.equal(url.searchParams.get("page"), "2")
})

test("buildProjectsUrl selects only the ProjectSummary fields", () => {
    const url = new URL(buildProjectsUrl(BASE, "en", 1))

    for (const field of [
        "title",
        "description",
        "url",
        "demo",
        "publishedDate",
        "coverImage",
        "tags",
    ]) {
        assert.equal(url.searchParams.get(`select[${field}]`), "true")
    }

    assert.equal(url.searchParams.get("select[content]"), null)
    assert.equal(url.searchParams.get("select[relatedProjects]"), null)
})

test("buildProjectsUrl produces distinct URLs per locale", () => {
    assert.notEqual(buildProjectsUrl(BASE, "en", 1), buildProjectsUrl(BASE, "es", 1))
})

test("getProjects follows pagination until hasNextPage is false", async () => {
    process.env.PORTFOLIO_API_URL = BASE
    const requested: string[] = []

    await withStubbedFetch(
        (url) => {
            requested.push(url)
            const page = new URL(url).searchParams.get("page")
            if (page === "1") {
                return payloadPage(
                    [{ id: 1, title: "One", publishedDate: "2026-01-01T00:00:00.000Z" }],
                    true,
                )
            }
            return payloadPage(
                [{ id: 2, title: "Two", publishedDate: "2025-01-01T00:00:00.000Z" }],
                false,
            )
        },
        async () => {
            const projects = await getProjects("en")
            assert.deepEqual(projects.map((p) => p.id), [1, 2])
        },
    )

    assert.equal(requested.length, 2)
    assert.equal(new URL(requested[1]).searchParams.get("page"), "2")
})

test("getProjects sends the required cache options", async () => {
    process.env.PORTFOLIO_API_URL = BASE
    const original = globalThis.fetch
    let seenInit: RequestInit | undefined

    globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
        seenInit = init
        return payloadPage([], false)
    }) as typeof fetch

    try {
        await getProjects("en")
    } finally {
        globalThis.fetch = original
    }

    assert.deepEqual((seenInit as { next?: unknown })?.next, {
        revalidate: 1800,
        tags: ["portfolio-projects"],
    })
})

test("getProjects orders undated projects last across pages", async () => {
    process.env.PORTFOLIO_API_URL = BASE

    await withStubbedFetch(
        () =>
            payloadPage(
                [
                    { id: 1, title: "Undated", publishedDate: null },
                    { id: 2, title: "Old", publishedDate: "2024-02-01T00:00:00.000Z" },
                    { id: 3, title: "New", publishedDate: "2026-04-25T00:00:00.000Z" },
                ],
                false,
            ),
        async () => {
            const projects = await getProjects("en")
            assert.deepEqual(projects.map((p) => p.id), [3, 2, 1])
        },
    )
})

test("getProjects throws ProjectsUnavailableError on a non-2xx response", async () => {
    process.env.PORTFOLIO_API_URL = BASE

    await withStubbedFetch(
        () => new Response("nope", { status: 503 }),
        async () => {
            await assert.rejects(
                () => getProjects("en"),
                (error: unknown) => {
                    assert.ok(error instanceof ProjectsUnavailableError)
                    assert.ok(!error.message.includes("massick.dev"))
                    return true
                },
            )
        },
    )
})

test("getProjects throws ProjectsUnavailableError on an unexpected body", async () => {
    process.env.PORTFOLIO_API_URL = BASE

    await withStubbedFetch(
        () =>
            new Response(JSON.stringify({ notDocs: true }), {
                status: 200,
                headers: { "content-type": "application/json" },
            }),
        async () => {
            await assert.rejects(() => getProjects("en"), ProjectsUnavailableError)
        },
    )
})

test("getProjects throws ProjectsUnavailableError when docs contains malformed data", async () => {
    process.env.PORTFOLIO_API_URL = BASE

    await withStubbedFetch(
        () =>
            new Response(JSON.stringify({ docs: [null], hasNextPage: false }), {
                status: 200,
                headers: { "content-type": "application/json" },
            }),
        async () => {
            await assert.rejects(() => getProjects("en"), ProjectsUnavailableError)
        },
    )
})

test("getProjects throws when PORTFOLIO_API_URL is missing", async () => {
    const previous = process.env.PORTFOLIO_API_URL
    delete process.env.PORTFOLIO_API_URL
    try {
        await assert.rejects(() => getProjects("en"), ProjectsUnavailableError)
    } finally {
        process.env.PORTFOLIO_API_URL = previous
    }
})
