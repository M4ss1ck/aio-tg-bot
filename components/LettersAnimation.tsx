"use client"
import React, { useEffect } from 'react'

const LettersAnimation = ({ title }: { title: string }) => {
    const array = [...title]

    useEffect(() => {
        const letters: NodeListOf<HTMLElement> = document.querySelectorAll(".animateletter")
        let duration = 500
        for (let i = 0; i < letters.length; i++) {
            const letter = letters[i]
            letter.style.visibility = 'visible'
            duration += 100
            letter.animate(
                [
                    { transform: `translateY(-100vh) scale(0,0)` },
                    { transform: `translateY(0) scale(1,1)` },
                ],
                { duration: duration, iterations: 1, easing: "ease-in-out" }
            )
        }
    }, [])
    return (
        <h1
            aria-label={title}
            className="z-10 flex flex-wrap items-center justify-center font-display text-2xl uppercase"
        >
            {array.map((letter, index) => {
                return (
                    <span
                        key={index}
                        className={
                            letter === " "
                                ? "min-w-[1rem]"
                                : "animateletter text-other min-w-[1rem] cursor-default"
                        }
                        style={{ visibility: 'hidden' }}
                    >
                        {letter}
                    </span>
                )
            })}
        </h1>
    )
}

export default LettersAnimation
