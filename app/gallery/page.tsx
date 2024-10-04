import { Back } from "../../components/Back"
import Link from "next/link"

export default async function Page() {
    return <main className="flex flex-col items-center justify-center w-full h-full min-h-screen">
        <Link href={"/"}>
            <h1 className="p-4 text-4xl">Personal Gallery</h1>
        </Link>
        <section className="flex flex-col items-center justify-center gap-2 p-6 my-6">
            <p className="text-xl">You can now create your very own gallery using <code>/gallery</code> command replying to photos</p>
            <p className="text-lg">Try it out!</p>
        </section>
        <Back />
    </main>
}