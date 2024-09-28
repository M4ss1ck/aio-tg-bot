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
    return <>
        <pre>{userData}</pre>
    </>
}