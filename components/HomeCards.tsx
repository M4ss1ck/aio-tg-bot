import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Card } from './Card'
import Me from "../public/images/square_me.png"

export const HomeCards = () => {
    return (
        <section className="p-6">
            <div className="container grid grid-cols-1 gap-6 mx-auto">
                <Link href={"/bots"}>
                    <Card title="My Bots" icon={
                        <svg xmlns="http://www.w3.org/2000/svg" width={64} height={64} viewBox="0 0 32 32">
                            <path fill="currentColor" d="M9.763 4.857a7.75 7.75 0 0 1 6.264-2.85c0 2.617.02 5.335-.008 7.953c-2.219-.005-7.434.018-7.434.018a7 7 0 0 1 1.178-5.121m2.405.765a1.66 1.66 0 0 0 .038 2.658a1.688 1.688 0 1 0-.038-2.658m3.863 22.406a12.5 12.5 0 0 1-2.185-.169c0 .1-.008.287-.012.383C13.813 28.8 13.8 30 13.8 30H8.832s.019-2.811-.015-4.214c.023-.367-.28-.609-.492-.863a7.96 7.96 0 0 1-2-5.389v-8.433h9.7q-.009 8.462.006 16.927M5.541 12.644v6.6H3.753v-6.6Z"></path>
                            <path fill="currentColor" d="M16.022 2a7.95 7.95 0 0 1 5.483 1.989a6.3 6.3 0 0 1 1.676 2.625a12 12 0 0 1 .276 3.362l-7.44-.018s.005-5.342 0-7.959m1.784 3.553a1.663 1.663 0 0 0-.137 2.682a1.64 1.64 0 0 0 2.075.063a1.66 1.66 0 0 0 .39-2.25a1.634 1.634 0 0 0-2.323-.492ZM16.022 11.1h9.7v8.433a7.96 7.96 0 0 1-2 5.389c-.212.254-.515.5-.492.863c-.03 1.404-.013 4.215-.013 4.215h-4.971s-.01-1.2-.03-1.758c0-.1-.01-.288-.012-.383a12.5 12.5 0 0 1-2.185.169q.024-8.466.003-16.928m10.365 1.543h1.86v6.6h-1.879Z"></path>
                        </svg>
                    } />
                </Link>
                <Link href={"/projects"}>
                    <Card title="Other Projects" icon={
                        <svg xmlns="http://www.w3.org/2000/svg" width={64} height={64} viewBox="0 0 24 24">
                            <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} color="currentColor">
                                <path d="M20 14.5v-8c0-1.886 0-2.828-.586-3.414S17.886 2.5 16 2.5H8c-1.886 0-2.828 0-3.414.586S4 4.614 4 6.5v8m-.502 1.015L4.02 14.5h15.932l.55 1.015c1.443 2.662 1.803 3.993 1.254 4.989s-2.002.996-4.91.996H7.154c-2.909 0-4.363 0-4.911-.996c-.549-.996-.19-2.327 1.254-4.989"></path>
                                <path d="m15.5 7l.92.793c.387.333.58.5.58.707s-.193.374-.58.707L15.5 10m-7-3l-.92.793c-.387.333-.58.5-.58.707s.193.374.58.707L8.5 10M13 6l-2 5"></path>
                            </g>
                        </svg>
                    } />
                </Link>
                <Link href={"/you"}>
                    <Card title="About You" icon={
                        <svg xmlns="http://www.w3.org/2000/svg" width="64px" height="64px" viewBox="0 0 24 24">
                            <g fill="none" stroke="currentColor" strokeDasharray={20} strokeDashoffset={20} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
                                <path d="M6 19v-1c0 -2.21 1.79 -4 4 -4h4c2.21 0 4 1.79 4 4v1">
                                    <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.2s" values="20;0"></animate>
                                </path>
                                <path d="M12 11c-1.66 0 -3 -1.34 -3 -3c0 -1.66 1.34 -3 3 -3c1.66 0 3 1.34 3 3c0 1.66 -1.34 3 -3 3Z">
                                    <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.2s" dur="0.2s" values="20;0"></animate>
                                </path>
                            </g>
                        </svg>
                    } />
                </Link>
                <Link href={"/about"}>
                    <Card title="About Me" icon={<Image className='rounded-full' width={64} height={64} src={Me} alt='about me picture' />} />
                </Link>
            </div>
        </section>
    )
}
