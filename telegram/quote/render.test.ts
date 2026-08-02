import assert from 'node:assert/strict'
import { test } from 'node:test'
import sharp from 'sharp'
import { renderQuote, type QuoteEntry } from './render'

const entry = (over: Partial<QuoteEntry>): QuoteEntry => ({
    userId: 1,
    name: 'Ada Lovelace',
    colorId: 2,
    avatar: { gradient: ['#82b1ff', '#665fff'], initial: 'A' },
    text: 'Hello, world!',
    ...over,
})

test('renderQuote produces a valid sticker-sized webp', async () => {
    const webp = await renderQuote([entry({})])
    const meta = await sharp(webp).metadata()
    assert.equal(meta.format, 'webp')
    assert.equal(meta.hasAlpha, true)
    assert.ok(meta.width && meta.width <= 512, `width ${meta.width} <= 512`)
    assert.ok(meta.height && meta.height <= 512, `height ${meta.height} <= 512`)
})

test('renderQuote handles a reply and multiple grouped messages', async () => {
    const webp = await renderQuote([
        entry({ text: 'first', reply: { name: 'Ben', text: 'original', colorId: 4 } }),
        entry({ text: 'second' }),
    ])
    const meta = await sharp(webp).metadata()
    assert.equal(meta.format, 'webp')
    assert.ok((meta.width ?? 0) <= 512 && (meta.height ?? 0) <= 512)
})
