import Image from "next/image"
import { Back } from "../../components/Back"

export default function Page() {
    return <main className="flex flex-col items-center justify-center w-full h-full min-h-screen gap-2">
        <Image src="/images/square_me.jpg" alt="me" width={204} height={204} className="rounded-full" unoptimized />
        <h1 className="text-2xl">My name is <strong>NOT</strong> Massick</h1>
        <p>That&apos;s not even my lastname</p>
        <h1 className="text-2xl"><strong>BUT</strong> in most places I&apos;m @m4ss1ck</h1>
        <p>I&apos;m a web developer that develops stuff for the web</p>
        <Back />
    </main>
}
