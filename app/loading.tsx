export default function Loading() {
    return (
        <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4">
            <div
                className="size-12 animate-spin rounded-full border-4 border-white/20 border-t-other"
                role="status"
                aria-label="Loading"
            />
            <p className="font-display text-sm text-foreground/70">Loading…</p>
        </div>
    )
}
