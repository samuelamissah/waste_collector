export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <header className="sticky top-0 z-10 border-b border-black/[.08] bg-zinc-50/80 backdrop-blur dark:border-white/[.145] dark:bg-black/70">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-5 w-32 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-6 w-24 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-24 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-9 w-24 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-8 px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
              <div className="h-4 w-24 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
              <div className="mt-2 h-8 w-12 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 border-b border-black/[.08] pb-1 dark:border-white/[.145]">
          <div className="h-8 w-24 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-8 w-24 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-8 w-24 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-7 w-48 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex gap-2">
              <div className="h-9 w-32 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-9 w-20 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>

          <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between border-b border-black/[.08] pb-4 last:border-0 dark:border-white/[.145]">
                  <div className="space-y-2">
                    <div className="h-4 w-48 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-3 w-32 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
                  </div>
                  <div className="h-6 w-24 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
