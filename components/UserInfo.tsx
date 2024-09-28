'use client'

import { useState, useEffect } from 'react'

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
    return (<div className='p-4'>
        <h2 className='text-4xl font-bold'>Your Data</h2>
        <pre className='p-3 overflow-x-auto rounded-lg shadow-lg'>
            {JSON.stringify(JSON.parse(userData), null, 2)}
        </pre>
    </div>)
}