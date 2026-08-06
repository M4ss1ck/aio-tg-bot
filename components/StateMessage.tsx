export const StateMessage = ({
    title,
    body,
}: {
    title: string
    body: string
}) => (
    <div className="rounded-2xl border border-white/15 bg-surface p-6 text-center backdrop-blur-md">
        <p className="font-display text-lg text-other">{title}</p>
        <p className="mt-2 text-sm text-foreground/80">{body}</p>
    </div>
)
