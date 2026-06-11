import assert from 'node:assert/strict'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { test } from 'node:test'
import { getFontPath, getFonts } from './fonts'

test('quote fonts are loaded from traceable repo assets', async () => {
    for (const weight of [400, 500, 700] as const) {
        const fontPath = getFontPath(weight)
        assert.equal(path.basename(fontPath), `roboto-all-${weight}-normal.woff`)
        assert.match(fontPath, /public[/\\]fonts[/\\]quote[/\\]/)

        const meta = await stat(fontPath)
        assert.ok(meta.size > 0, `${fontPath} should not be empty`)
    }

    const fonts = await getFonts()
    assert.deepEqual(fonts.map((font) => font.weight), [400, 500, 700])
})
