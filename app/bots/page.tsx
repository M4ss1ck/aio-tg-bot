import { GithubCard } from "../../components/GithubCard"
import { Back } from "../../components/Back"
import { botList } from "../../config/constants"
import Link from "next/link"

export default async function Page() {
    const username = "m4ss1ck"
    let data = await fetch(`https://api.github.com/users/${username}/repos`)
    const repos = await data.json()
    return <main className="flex flex-col items-center justify-center w-full h-full min-h-screen">
        <Link href={"/"}>
            <h1 className="p-4 text-4xl">My Bots</h1>
        </Link>
        <section className="p-6 my-6">
            <div className="container grid grid-cols-1 gap-6 mx-auto">
                {repos.filter((repo: RepoI) => botList.includes(repo.name)).map((repo: RepoI) => <GithubCard key={repo.id} repo={repo} />)}
            </div>
            <p className="w-full mt-2 text-right">...and other secret stuff</p>
        </section>
        <Back />
    </main>
}