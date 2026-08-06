import { prisma } from '../../../db/prisma'
import { pathToTgLink } from '../../../utils/functions'
import { Gallery } from '../../../components/Gallery'
import { PageHeading } from '../../../components/PageHeading'
import { StateMessage } from '../../../components/StateMessage'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const photos = await prisma.photo.findMany({
        where: {
            userId: id
        }
    })
    if (!photos || photos.length === 0) return (
        <section className="flex flex-col items-center gap-4 py-6 text-center">
            <PageHeading>Your Gallery is Empty</PageHeading>
            <StateMessage
                title="Nothing here yet"
                body="Create your gallery with the /gallery command, replying to photos."
            />
        </section>
    )

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
        <section className="flex flex-col gap-4 py-6">
            <PageHeading>Your Gallery</PageHeading>
            <Gallery photos={photosWithLink} />
        </section>
    )
}
