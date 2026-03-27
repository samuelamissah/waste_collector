export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-black/[.08] border-t-black dark:border-white/[.145] dark:border-t-white" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
      </div>
    </div>
  )
}
