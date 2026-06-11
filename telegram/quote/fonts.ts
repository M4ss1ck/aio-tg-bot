import { readFile } from 'fs/promises'
import path from 'path'

export interface SatoriFont {
    name: string
    data: Buffer
    weight: 400 | 500 | 700
    style: 'normal'
}

let cache: SatoriFont[] | null = null

const fontsDir = path.join(process.cwd(), 'public', 'fonts', 'quote')

export function getFontPath(weight: SatoriFont['weight']): string {
    return path.join(fontsDir, `roboto-all-${weight}-normal.woff`)
}

/** Load Roboto (regular/medium/bold) from traceable app-owned assets. */
export async function getFonts(): Promise<SatoriFont[]> {
    if (cache) return cache
    const load = (weight: SatoriFont['weight']) => readFile(getFontPath(weight))
    const [regular, medium, bold] = await Promise.all([load(400), load(500), load(700)])
    cache = [
        { name: 'Roboto', data: regular, weight: 400, style: 'normal' },
        { name: 'Roboto', data: medium, weight: 500, style: 'normal' },
        { name: 'Roboto', data: bold, weight: 700, style: 'normal' },
    ]
    return cache
}
