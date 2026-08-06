import { PageHeading } from "../../components/PageHeading"
import { ProjectSection } from "../../components/ProjectSection"

export default function Page() {
    return (
        <section className="flex w-full flex-col">
            <PageHeading>My Bots</PageHeading>
            <ProjectSection kind="bots" />
        </section>
    )
}
