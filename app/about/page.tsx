import Image from "next/image"
import { Back } from "../../components/Back"
import { PageHeading } from "../../components/PageHeading"

export default function Page() {
    return (
        <section className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="relative size-40 overflow-hidden rounded-full border-2 border-other/70">
                <Image
                    src="/images/square_me.jpg"
                    alt="me"
                    fill
                    sizes="160px"
                    className="object-cover"
                    unoptimized
                />
            </div>

            <PageHeading>About Me</PageHeading>

            <div className="space-y-3 rounded-2xl border border-white/15 bg-surface p-5 backdrop-blur-md">
                <h2 className="font-display text-lg text-foreground">
                    My name is <strong>NOT</strong> Massick
                </h2>
                <p className="text-sm text-foreground/85">
                    That&apos;s not even my lastname
                </p>
                <h2 className="font-display text-lg text-foreground">
                    <strong>BUT</strong> in most places I&apos;m @m4ss1ck
                </h2>
                <p className="text-sm text-foreground/85">
                    I&apos;m a web developer that develops stuff for the web
                </p>
            </div>

            <Back />
        </section>
    )
}
