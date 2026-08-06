import { Back } from "../../components/Back"
import { PageHeading } from "../../components/PageHeading"

export default async function Page() {
    return (
        <section className="flex flex-col items-center gap-4 py-6 text-center">
            <PageHeading>Personal Gallery</PageHeading>

            <div className="space-y-3 rounded-2xl border border-white/15 bg-surface p-5 backdrop-blur-md">
                <p className="text-sm text-foreground/90">
                    You can now create your very own gallery using{" "}
                    <code className="rounded bg-black/30 px-1.5 py-0.5 font-display text-other">
                        /gallery
                    </code>{" "}
                    command replying to photos
                </p>
                <p className="font-display text-base text-other">Try it out!</p>
            </div>

            <Back />
        </section>
    )
}
