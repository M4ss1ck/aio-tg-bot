import Link from "next/link"
import Image from "next/image"

export const GithubCard: React.FC<GithubCardProps> = ({ repo, children }) => {
    return <div className="flex flex-col p-4 rounded-lg shadow-md md:space-x-6 shadow-telegram-hint">
        <div className="flex flex-row space-x-4">
            <div className="relative flex justify-center p-2 text-2xl align-middle rounded-lg sm:p-4">
                <svg xmlns="http://www.w3.org/2000/svg" width={48} height={48} viewBox="0 0 24 24">
                    <mask id="lineMdGithubLoop0" width={24} height={24} x={0} y={0}>
                        <g fill="#fff">
                            <ellipse cx={9.5} cy={9} rx={1.5} ry={1}></ellipse>
                            <ellipse cx={14.5} cy={9} rx={1.5} ry={1}></ellipse>
                        </g>
                    </mask>
                    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
                        <path strokeDasharray={32} strokeDashoffset={32} d="M12 4c1.67 0 2.61 0.4 3 0.5c0.53 -0.43 1.94 -1.5 3.5 -1.5c0.34 1 0.29 2.22 0 3c0.75 1 1 2 1 3.5c0 2.19 -0.48 3.58 -1.5 4.5c-1.02 0.92 -2.11 1.37 -3.5 1.5c0.65 0.54 0.5 1.87 0.5 2.5c0 0.73 0 3 0 3M12 4c-1.67 0 -2.61 0.4 -3 0.5c-0.53 -0.43 -1.94 -1.5 -3.5 -1.5c-0.34 1 -0.29 2.22 0 3c-0.75 1 -1 2 -1 3.5c0 2.19 0.48 3.58 1.5 4.5c1.02 0.92 2.11 1.37 3.5 1.5c-0.65 0.54 -0.5 1.87 -0.5 2.5c0 0.73 0 3 0 3">
                            <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.35s" values="32;0"></animate>
                        </path>
                        <path strokeDasharray={10} strokeDashoffset={10} d="M9 19c-1.406 0-2.844-.563-3.688-1.188C4.47 17.188 4.22 16.157 3 15.5">
                            <animate attributeName="d" dur="1.5s" repeatCount="indefinite" values="M9 19c-1.406 0-2.844-.563-3.688-1.188C4.47 17.188 4.22 16.157 3 15.5;M9 19c-1.406 0-3-.5-4-.5-.532 0-1 0-2-.5;M9 19c-1.406 0-2.844-.563-3.688-1.188C4.47 17.188 4.22 16.157 3 15.5"></animate>
                            <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.4s" dur="0.1s" values="10;0"></animate>
                        </path>
                    </g>
                    <rect width={8} height={4} x={8} y={11} fill="currentColor" mask="url(#lineMdGithubLoop0)">
                        <animate attributeName="y" dur="5s" keyTimes="0;0.45;0.46;0.54;0.55;1" repeatCount="indefinite" values="11;11;7;7;11;11"></animate>
                    </rect>
                </svg>
                {repo.owner.avatar_url ? <Image src={repo.owner.avatar_url} alt={repo.owner.login} width={32} height={32} className="absolute bottom-0 right-0 border-4 rounded-full border-telegram-text" /> : null}
            </div>
            <div className="flex flex-col justify-center truncate align-middle">
                <Link href={repo.html_url}>
                    <p className="text-3xl font-semibold leading-none">{repo.name}</p>
                </Link>
                <p className="flex items-center justify-start text-telegram-text">
                    <span className="inline-flex">
                        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M7.105 15.21A3.001 3.001 0 1 1 5 15.17V8.83a3.001 3.001 0 1 1 2 0V12c.836-.628 1.874-1 3-1h4a3 3 0 0 0 2.895-2.21a3.001 3.001 0 1 1 2.032.064A5 5 0 0 1 14 13h-4a3 3 0 0 0-2.895 2.21M6 17a1 1 0 1 0 0 2a1 1 0 0 0 0-2M6 5a1 1 0 1 0 0 2a1 1 0 0 0 0-2m12 0a1 1 0 1 0 0 2a1 1 0 0 0 0-2"></path>
                        </svg>
                    </span>
                    &nbsp;/{repo.default_branch}
                    <span className="inline-flex ml-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                            <path fill="currentColor" fillOpacity={0} stroke="currentColor" strokeDasharray={64} strokeDashoffset={64} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l2.35 5.76l6.21 0.46l-4.76 4.02l1.49 6.04l-5.29 -3.28l-5.29 3.28l1.49 -6.04l-4.76 -4.02l6.21 -0.46Z">
                                <animate fill="freeze" attributeName="fill-opacity" begin="0.6s" dur="0.5s" values="0;1"></animate>
                                <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="64;0"></animate>
                            </path>
                        </svg>
                    </span>
                    &nbsp;{repo.stargazers_count}
                    <span className="inline-flex ml-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                            <path fill="currentColor" fillRule="evenodd" d="M1 12c2.028-4.152 6.192-7 11-7s8.972 2.848 11 7c-2.028 4.152-6.192 7-11 7s-8.972-2.848-11-7m11 3.5a3.5 3.5 0 1 0 0-7a3.5 3.5 0 0 0 0 7"></path>
                        </svg>
                    </span>
                    &nbsp;{repo.watchers_count}
                </p>
                {children}
            </div>
        </div>
        <p className="text-lg text-telegram-text">{repo.description}</p>
    </div>
}