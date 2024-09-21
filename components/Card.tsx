type CardProps = {
    icon: React.ReactNode
    title: string
}

export const Card: React.FC<CardProps> = ({ icon, title }) => {
    return <div className="flex p-4 space-x-4 rounded-lg shadow-md md:space-x-6 shadow-telegram-hint">
        <div className="flex justify-center p-2 text-2xl align-middle rounded-lg sm:p-4">
            {icon}
        </div>
        <div className="flex flex-col justify-center truncate align-middle">
            <p className="text-3xl font-semibold leading-none">{title}</p>
        </div>
    </div>
}