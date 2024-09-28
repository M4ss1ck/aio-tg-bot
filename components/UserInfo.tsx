'use client'

import { useState, useEffect } from 'react'

export const UserInfo = () => {
    const userData = window.Telegram.WebApp.initData
    console.log(userData)
    return <>
        <pre>{userData}</pre>
    </>
}