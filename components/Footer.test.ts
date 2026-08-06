import assert from "node:assert/strict"
import { test } from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import { Footer } from "./Footer"

test("X icon keeps its final base paths while retaining SMIL animation", () => {
    const markup = renderToStaticMarkup(Footer())
    const twitterMarkup = markup.match(
        /<a href="https:\/\/twitter\.com\/m4ss1ck"[\s\S]*?<\/a>/,
    )?.[0]

    assert.ok(twitterMarkup)
    assert.match(
        twitterMarkup,
        /d="M1 2h2\.5L18\.5 22h-2\.5zM5\.5 2h2\.5L23 22h-2\.5z"/,
    )
    assert.match(
        twitterMarkup,
        /d="M3 2h5v2h-5zM16 22h5v-2h-5z"/,
    )
    assert.match(
        twitterMarkup,
        /d="M18\.5 2h3\.5L5 22h-3\.5z"/,
    )
    assert.match(twitterMarkup, /attributeName="d"/)
})
