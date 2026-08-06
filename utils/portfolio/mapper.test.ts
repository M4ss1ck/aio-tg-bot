import assert from "node:assert/strict"
import { test } from "node:test"
import {
    isPayloadProjectsResponse,
    mapProject,
    orderProjects,
    resolveMediaUrl,
} from "./mapper"
import type { ProjectSummary } from "./types"

const BASE = "https://www.massick.dev"

test("resolveMediaUrl resolves a relative Payload media path", () => {
    assert.equal(
        resolveMediaUrl("/api/media/file/melofy.png", BASE),
        "https://www.massick.dev/api/media/file/melofy.png",
    )
})

test("resolveMediaUrl leaves an absolute URL untouched", () => {
    assert.equal(
        resolveMediaUrl("https://cdn.example.com/a.png", BASE),
        "https://cdn.example.com/a.png",
    )
})

test("mapProject normalizes a complete document", () => {
    const result = mapProject(
        {
            id: 52,
            title: "Melofy",
            description: "Sync listening rooms",
            url: null,
            demo: "https://melofy.cap.massick.dev/",
            publishedDate: "2026-04-25T12:00:00.000Z",
            coverImage: {
                url: "/api/media/file/melofy.png",
                alt: "Melofy",
                width: 992,
                height: 737,
            },
            tags: [{ id: 10, name: "React" }],
        },
        BASE,
    )

    assert.deepEqual(result, {
        id: 52,
        title: "Melofy",
        description: "Sync listening rooms",
        url: null,
        demo: "https://melofy.cap.massick.dev/",
        publishedDate: "2026-04-25T12:00:00.000Z",
        coverImage: {
            url: "https://www.massick.dev/api/media/file/melofy.png",
            alt: "Melofy",
            width: 992,
            height: 737,
        },
        tags: [{ id: 10, name: "React" }],
    })
})

test("mapProject returns a null coverImage when the document has none", () => {
    const result = mapProject(
        { id: 1, title: "Bot manager", coverImage: null, tags: [] },
        BASE,
    )
    assert.equal(result?.coverImage, null)
})

test("mapProject falls back to the title when the media has no alt text", () => {
    const result = mapProject(
        {
            id: 1,
            title: "Bot manager",
            coverImage: { url: "/api/media/file/x.png", alt: null },
            tags: [],
        },
        BASE,
    )
    assert.equal(result?.coverImage?.alt, "Bot manager")
    assert.equal(result?.coverImage?.width, null)
})

test("mapProject drops unpopulated numeric relations", () => {
    const result = mapProject(
        { id: 1, title: "X", coverImage: 23, tags: [4, { id: 2, name: "Bun" }] },
        BASE,
    )
    assert.equal(result?.coverImage, null)
    assert.deepEqual(result?.tags, [{ id: 2, name: "Bun" }])
})

test("mapProject normalizes empty optional strings to null", () => {
    const result = mapProject(
        { id: 1, title: "X", description: "", url: "", demo: "", tags: [] },
        BASE,
    )
    assert.equal(result?.description, null)
    assert.equal(result?.url, null)
    assert.equal(result?.demo, null)
    assert.equal(result?.publishedDate, null)
})

test("mapProject rejects a document with no usable id or title", () => {
    assert.equal(mapProject({ title: "No id" }, BASE), null)
    assert.equal(mapProject({ id: 1 }, BASE), null)
    assert.equal(mapProject({ id: 1, title: "   " }, BASE), null)
})

test("orderProjects sorts by date descending and puts undated projects last", () => {
    const build = (id: number, publishedDate: string | null): ProjectSummary => ({
        id,
        title: `p${id}`,
        description: null,
        url: null,
        demo: null,
        publishedDate,
        coverImage: null,
        tags: [],
    })

    const ordered = orderProjects([
        build(1, null),
        build(2, "2024-02-01T03:00:00.000Z"),
        build(3, "2026-04-25T12:00:00.000Z"),
    ])

    assert.deepEqual(
        ordered.map((project) => project.id),
        [3, 2, 1],
    )
})

test("isPayloadProjectsResponse accepts a docs array and rejects anything else", () => {
    assert.equal(isPayloadProjectsResponse({ docs: [] }), true)
    assert.equal(isPayloadProjectsResponse({ docs: "nope" }), false)
    assert.equal(isPayloadProjectsResponse(null), false)
    assert.equal(isPayloadProjectsResponse("<html>"), false)
})
