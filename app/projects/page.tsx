import { PageHeading } from "../../components/PageHeading"
import { ProjectSection } from "../../components/ProjectSection"

export default function Page() {
    return (
        <section className="flex w-full flex-col">
            <PageHeading>Other Projects</PageHeading>
            <ProjectSection kind="others" />
        </section>
    )
}
