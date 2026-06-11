import sharp from 'sharp'
import { tgAPI } from '../../config/constants'
import type { MyContext } from '../types'

const MEDIA_RENDER_PX = 560 // 2x the on-canvas max, for crisp downscaling

/** Download a Telegram file and return it as a PNG data URL with its dimensions. */
export async function fetchMediaDataUrl(
    ctx: MyContext,
    fileId: string,
    width?: number,
    height?: number,
): Promise<{ dataUrl: string; width: number; height: number } | undefined> {
    try {
        const file = await ctx.api.getFile(fileId)
        const link = `${tgAPI}/file/bot${ctx.api.token}/${file.file_path}`
        const res = await fetch(link)
        const input = Buffer.from(await res.arrayBuffer())
        const image = sharp(input)
        const meta = await image.metadata()
        const png = await image
            .resize({ width: MEDIA_RENDER_PX, height: MEDIA_RENDER_PX, fit: 'inside', withoutEnlargement: true })
            .png()
            .toBuffer()
        return {
            dataUrl: `data:image/png;base64,${png.toString('base64')}`,
            width: width || meta.width || MEDIA_RENDER_PX,
            height: height || meta.height || MEDIA_RENDER_PX,
        }
    } catch (error) {
        console.error('[quote] fetchMediaDataUrl error', error)
        return undefined
    }
}
