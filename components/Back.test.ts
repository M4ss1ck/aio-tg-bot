import assert from "node:assert/strict"
import { test } from "node:test"
import { Back } from "./Back"
import { BackLink } from "./BackLink"

test("Back remains the BackLink compatibility alias", () => {
    assert.equal(Back, BackLink)
})
