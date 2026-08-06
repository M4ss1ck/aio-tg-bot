'use client'

interface GalleryProps {
    photos: {
        src: string
        [key: string]: unknown
    }[]
}

/**
 * Touch-friendly scroll-snap strip. The previous carousel had no React 19
 * support. Photos arrive as base64 data URIs, which next/image
 * cannot optimize, so a plain <img> is correct here.
 */
export const Gallery = ({ photos }: GalleryProps) => {
    return (
        <ul className="flex w-full snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
            {photos.map((photo, index) => (
                <li
                    key={index}
                    className="w-[85%] shrink-0 snap-center first:ml-[7.5%] last:mr-[7.5%]"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={photo.src}
                        alt={`Photo ${index + 1}`}
                        className="h-auto w-full rounded-2xl border border-white/15"
                    />
                </li>
            ))}
        </ul>
    )
}
