import Link from "next/link"
import { Card } from "../../components/Card"
import { Back } from "../../components/Back"

export default function Page() {
    return <main className="flex flex-col items-center justify-center w-full h-[100dvh]">
        <h1 className="text-2xl">My bots</h1>
        <section className="p-6 my-6">
            <div className="container flex flex-col items-center gap-6">
                <svg xmlns="http://www.w3.org/2000/svg" width={64} height={64} viewBox="0 0 64 64">
                    <path fill="#ffdd67" d="M2 32c0 16.6 13.4 30 30 30s30-13.4 30-30S48.6 2 32 2S2 15.4 2 32"></path>
                    <path fill="#65b1ef" d="M47.7 37.6c0 8.6 11.7 8.6 11.7 0c0-6.3-5.8-12.4-5.8-12.4s-5.9 6.1-5.9 12.4"></path>
                    <g fill="#664e27">
                        <circle cx={38.5} cy={35} r={5}></circle>
                        <circle cx={15.5} cy={35} r={5}></circle>
                    </g>
                    <path fill="#917524" d="M20.6 19.9c-3.2 2.7-7.5 3.9-11.7 3.1c-.6-.1-1.1 2-.4 2.2c4.8.9 9.8-.5 13.5-3.6c.5-.5-1-2.1-1.4-1.7m24.5 3c-4.2.7-8.5-.4-11.7-3.1c-.4-.4-2 1.2-1.4 1.7c3.7 3.2 8.7 4.5 13.5 3.6c.7-.2.2-2.3-.4-2.2"></path>
                    <path fill="#664e27" d="M38.1 47.3c-5.8-1.5-12-.4-16.9 3c-1.2.9 1.1 4 2.3 3.2c3.2-2.3 8.4-3.8 13.7-2.4c1.3.3 2.4-3.3.9-3.8"></path>
                </svg>
                <p className="text-center">
                    Under construction
                </p>
            </div>
        </section>
        <Back />
    </main>
}