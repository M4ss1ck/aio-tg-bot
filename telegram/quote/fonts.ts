import { readFile } from 'fs/promises'
import { createRequire } from 'module'
import path from 'path'

const require = createRequire(import.meta.url)

export interface SatoriFont {
    name: string
    data: Buffer
    weight: 400 | 500 | 700
    style: 'normal'
}

let cache: SatoriFont[] | null = null

/** Load Roboto (regular/medium/bold) from the bundled @fontsource/roboto package. */
export async function getFonts(): Promise<SatoriFont[]> {
    if (cache) return cache
    const dir = path.dirname(require.resolve('@fontsource/roboto/package.json'))
    const load = (weight: number) => readFile(path.join(dir, 'files', `roboto-all-${weight}-normal.woff`))
    const [regular, medium, bold] = await Promise.all([load(400), load(500), load(700)])
    cache = [
        { name: 'Roboto', data: regular, weight: 400, style: 'normal' },
        { name: 'Roboto', data: medium, weight: 500, style: 'normal' },
        { name: 'Roboto', data: bold, weight: 700, style: 'normal' },
    ]
    return cache
}
