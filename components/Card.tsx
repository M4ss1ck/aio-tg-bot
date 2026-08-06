export const Card: React.FC<CardProps> = ({ icon, title }) => {
    return (
        <div className="flex min-h-16 items-center gap-4 rounded-2xl border border-white/15 bg-surface p-4 backdrop-blur-md">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl text-other">
                {icon}
            </div>
            <p className="font-display text-xl text-foreground">{title}</p>
        </div>
    )
}
