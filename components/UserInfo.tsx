'use client'
import Link from 'next/link';
import { useState, useEffect } from 'react'
import { Back } from './Back';

export const UserInfo = () => {
    const [userData, setUserData] = useState<string>("");

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const initData = decodeURIComponent(window.Telegram.WebApp.initData).split("&");
            const userDataFiltered = initData.map(pair => pair.split("="));
            for (const pair of userDataFiltered) {
                if (pair[0] === 'user') {
                    setUserData(pair[1]);
                }

            }
        }
    }, []);
    return (<main className="flex flex-col items-center justify-center w-full h-full min-h-screen">
        <Link href={"/"}>
            <h1 className='p-4 text-4xl'>Your Data</h1>
        </Link>
        {userData ? <pre className='p-3 overflow-x-auto rounded-lg shadow-lg'>
            {JSON.stringify(JSON.parse(userData), null, 2)}
        </pre> : <p className='text-lg font-light'>oops</p>}
        <Back />
    </main>)
}