import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import sharp from 'sharp'
import { getFonts } from './fonts'
import type { Avatar } from './avatar'

export interface QuoteEntry {
    userId: number
    name: string
    colorId: number
    avatar: Avatar
    text?: string
    media?: { dataUrl: string; width: number; height: number }
    reply?: { name: string; text: string; colorId: number }
}

// Telegram-style name colors, indexed by colorId.
const NAME_COLORS = ['#e17076', '#eda86c', '#a695e7', '#7bc862', '#6ec9cb', '#65aadd', '#ee7aae']

const BG = '#17212b'
const BUBBLE = '#1f2c3a'
const TEXT = '#ffffff'
const SECONDARY = '#8b98a5'

const RENDER_WIDTH = 408
const STICKER_SIZE = 512
const BUBBLE_MAX = 320
const MEDIA_MAX = 280

type SNode = { type: string; props: Record<string, unknown> }

function el(type: string, style: Record<string, unknown>, children?: unknown): SNode {
    return { type, props: { style, ...(children !== undefined ? { children } : {}) } }
}

function nameColor(colorId: number): string {
    return NAME_COLORS[colorId % NAME_COLORS.length]
}

function avatarNode(avatar: Avatar): SNode {
    const size = 40
    if (avatar.dataUrl) {
        return { type: 'img', props: { src: avatar.dataUrl, width: size, height: size, style: { borderRadius: size / 2 } } }
    }
    return el('div', {
        display: 'flex',
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `linear-gradient(180deg, ${avatar.gradient[0]}, ${avatar.gradient[1]})`,
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 700,
    }, avatar.initial)
}

function replyNode(reply: NonNullable<QuoteEntry['reply']>): SNode {
    const color = nameColor(reply.colorId)
    const snippet = reply.text.length > 90 ? `${reply.text.slice(0, 90)}…` : reply.text
    return el('div', {
        display: 'flex',
        flexDirection: 'column',
        marginBottom: 4,
        paddingLeft: 6,
        borderLeft: `2px solid ${color}`,
        maxWidth: BUBBLE_MAX - 24,
    }, [
        el('div', { display: 'flex', color, fontSize: 13, fontWeight: 500 }, reply.name),
        el('div', {
            display: 'flex',
            color: SECONDARY,
            fontSize: 13,
            maxWidth: BUBBLE_MAX - 24,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        }, snippet),
    ])
}

function mediaNode(media: NonNullable<QuoteEntry['media']>, hasText: boolean): SNode {
    const scale = Math.min(MEDIA_MAX / media.width, MEDIA_MAX / media.height, 1)
    const w = Math.round(media.width * scale)
    const h = Math.round(media.height * scale)
    return {
        type: 'img',
        props: { src: media.dataUrl, width: w, height: h, style: { borderRadius: 8, marginBottom: hasText ? 6 : 0 } },
    }
}

function bubbleNode(entry: QuoteEntry, showHeader: boolean): SNode {
    const children: SNode[] = []
    if (showHeader) {
        children.push(el('div', { display: 'flex', color: nameColor(entry.colorId), fontSize: 15, fontWeight: 700, marginBottom: 2 }, entry.name))
    }
    if (entry.reply) children.push(replyNode(entry.reply))
    if (entry.media) children.push(mediaNode(entry.media, Boolean(entry.text)))
    if (entry.text) {
        children.push(el('div', {
            display: 'flex',
            color: TEXT,
            fontSize: 16,
            lineHeight: 1.3,
            maxWidth: BUBBLE_MAX - 20,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
        }, entry.text))
    }
    return el('div', {
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: BUBBLE,
        borderRadius: 14,
        padding: '6px 10px',
        maxWidth: BUBBLE_MAX,
    }, children)
}

/** Group consecutive entries by the same author into one avatar + stacked bubbles. */
function groupNode(entries: QuoteEntry[]): SNode {
    const bubbles = entries.map((e, i) => bubbleNode(e, i === 0))
    return el('div', { display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 8 }, [
        avatarNode(entries[0].avatar),
        el('div', { display: 'flex', flexDirection: 'column', gap: 2 }, bubbles),
    ])
}

function buildTree(entries: QuoteEntry[]): SNode {
    const groups: QuoteEntry[][] = []
    for (const entry of entries) {
        const last = groups[groups.length - 1]
        if (last && last[0].userId === entry.userId) last.push(entry)
        else groups.push([entry])
    }
    return el('div', {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 8,
        padding: 12,
        backgroundColor: BG,
    }, groups.map(groupNode))
}

async function loadEmoji(code: string, text: string): Promise<string> {
    if (code !== 'emoji') return ''
    try {
        const cp = [...text].map(c => c.codePointAt(0)!.toString(16)).filter(c => c !== 'fe0f').join('-')
        const res = await fetch(`https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/${cp}.svg`)
        if (!res.ok) return ''
        const svg = await res.text()
        return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    } catch {
        return ''
    }
}

/** Render the quote entries into a Telegram-sticker-sized (<=512px) webp buffer. */
export async function renderQuote(entries: QuoteEntry[]): Promise<Buffer> {
    const fonts = await getFonts()
    const svg = await satori(buildTree(entries) as never, {
        width: RENDER_WIDTH,
        fonts,
        loadAdditionalAsset: loadEmoji,
    })

    const intrinsic = new Resvg(svg)
    const mode = intrinsic.height >= intrinsic.width ? 'height' : 'width'
    const png = new Resvg(svg, { fitTo: { mode, value: STICKER_SIZE } }).render().asPng()
    return sharp(png).webp().toBuffer()
}
