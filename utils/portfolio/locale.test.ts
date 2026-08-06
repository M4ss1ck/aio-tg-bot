import assert from "node:assert/strict"
import { test } from "node:test"
import { resolveLocale } from "./locale"

test("resolveLocale returns es for a Spanish preference", () => {
    assert.equal(resolveLocale("es"), "es")
    assert.equal(resolveLocale("es-ES,es;q=0.9"), "es")
    assert.equal(resolveLocale("ES-419"), "es")
})

test("resolveLocale returns en for everything else", () => {
    assert.equal(resolveLocale("en-US,en;q=0.9"), "en")
    assert.equal(resolveLocale("fr-FR"), "en")
    assert.equal(resolveLocale("de,ja;q=0.8"), "en")
})

test("resolveLocale honours quality values over list order", () => {
    assert.equal(resolveLocale("en;q=0.5,es;q=0.9"), "es")
    assert.equal(resolveLocale("es;q=0.2,en;q=0.8"), "en")
})

test("resolveLocale ignores languages explicitly refused with q=0", () => {
    assert.equal(resolveLocale("es;q=0,en;q=0.5"), "en")
})

test("resolveLocale defaults to en for missing or unusable headers", () => {
    assert.equal(resolveLocale(null), "en")
    assert.equal(resolveLocale(undefined), "en")
    assert.equal(resolveLocale(""), "en")
    assert.equal(resolveLocale("*"), "en")
})
