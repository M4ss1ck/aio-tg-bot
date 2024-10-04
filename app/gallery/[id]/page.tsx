import { prisma } from '../../../db/prisma'
import { pathToTgLink } from '../../../utils/functions'
import { Gallery } from '../../../components/Gallery'

export default async function Page({ params }: { params: { id: string } }) {
    const photos = await prisma.photo.findMany({
        where: {
            userId: params.id
        }
    })
    if (!photos || photos.length === 0) return (<main className="flex flex-col items-center justify-center w-full h-full min-h-screen">
        <h1 className="p-4 text-4xl">Your Personal Gallery is Empty</h1>
        <section className="flex flex-col items-center justify-center gap-2 p-6 my-6">
            <p className="text-xl">But you can now create it using <code>/gallery</code> command replying to photos</p>
            <p className="text-lg">Try it out!</p>
        </section>
    </main>)

    const photosWithLink = await Promise.all(photos.map(async photo => {
        const response = await fetch(pathToTgLink(photo.path, photo.token))
        const buffer = await response.arrayBuffer()
        const base64Flag = 'data:image/jpeg;base64,'
        const imageStr = arrayBufferToBase64(buffer)
        return {
            ...photo,
            src: base64Flag + imageStr
        }
    }))

    function arrayBufferToBase64(buffer: ArrayBuffer) {
        const binary = Buffer.from(buffer).toString('base64')
        return binary
    }

    return (
        <main>
            <Gallery photos={photosWithLink} />
        </main>
    )
}