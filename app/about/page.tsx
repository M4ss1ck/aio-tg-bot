import Image from "next/image"
import Me from "../../public/images/square_me.png"
import { Back } from "../../components/Back"

export default function Page() {
    return <main className="flex flex-col items-center justify-center w-full h-full min-h-screen">
        <Image src={Me} alt="me" className="rounded-full" />
        <h1 className="text-2xl">My name is <strong>NOT</strong> Massick</h1>
        <p>That&apos;s not even my lastname</p>
        <h1 className="text-2xl"><strong>BUT</strong> in most places I&apos;m @m4ss1ck</h1>
        <p>I&apos;m a web developer that develops stuff for the web</p>
        <Back />
    </main>
}