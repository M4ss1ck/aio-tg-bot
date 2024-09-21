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
            duration += 400
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
            className="absolute z-10 flex flex-wrap items-center justify-center text-2xl text-center uppercase md:text-5xl lg:text-7xl"
        >
            {array.map((letter, index) => {
                return (
                    <span
                        key={index}
                        className={
                            letter === " "
                                ? "min-w-[1rem] mr-auto w-full"
                                : "animateletter transition duration-300 hover:skew-y-12 hover:even:-skew-y-12 hover:-translate-y-16 hover:even:-translate-y-14 hover:scale-150 text-primario dark:text-secundario min-w-[1rem] cursor-default"
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