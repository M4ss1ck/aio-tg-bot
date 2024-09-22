type CardProps = {
    icon: React.ReactNode
    title: string
}

type GithubCardProps = {
    children?: React.ReactNode
    repo: RepoI
}

interface RepoI {
    id: number
    name: string
    description: string
    html_url: string
    created_at: string
    updated_at: string
    default_branch: string
    stargazers_count: number
    watchers_count: number
    owner: {
        login: string
        avatar_url: string
        html_url: string
    }
}