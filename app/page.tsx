import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-between px-6 py-16">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold tracking-tight">Waste Collector</div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg border border-black/[.08] px-4 py-2 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
            >
              Log in
            </Link>
            <Link href="/signup" className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white">
              Create account
            </Link>
          </div>
        </div>

        <div className="mt-14 grid items-center gap-10 md:grid-cols-2">
          <div>
            <div className="inline-flex items-center rounded-full border border-black/[.08] px-3 py-1 text-xs text-zinc-700 dark:border-white/[.145] dark:text-zinc-200">
              Track pickups • Earn eco-points • Cleaner communities
            </div>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              Waste pickup management for residents, collectors, and admins
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
              Request pickups, monitor status, and award eco-points for proper sorting. Collectors
              verify and complete assigned pickups. Admins filter requests and assign collectors.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg bg-green-700 px-5 py-3 text-sm font-medium text-white"
              >
                Go to login
              </Link>
              <Link
                href="/login?next=%2Fdashboard%23request-pickup"
                className="inline-flex items-center justify-center rounded-lg border border-black/[.08] px-5 py-3 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
              >
                Request pickup
              </Link>
            </div>

            <div className="mt-8 grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-2xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black">
                <div className="font-semibold">Residents</div>
                <div className="mt-1 text-zinc-600 dark:text-zinc-300">
                  Submit pickup requests and view recent activity.
                </div>
              </div>
              <div className="rounded-2xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black">
                <div className="font-semibold">Collectors</div>
                <div className="mt-1 text-zinc-600 dark:text-zinc-300">
                  Verify pickups, complete jobs, and log activity.
                </div>
              </div>
              <div className="rounded-2xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black">
                <div className="font-semibold">Admins</div>
                <div className="mt-1 text-zinc-600 dark:text-zinc-300">
                  Filter requests, assign collectors, and track stats.
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <div className="rounded-2xl bg-zinc-50 p-6 dark:bg-zinc-900/40">
              <div className="text-sm font-semibold">MVP eco-points</div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black">
                  <div className="text-xs text-zinc-600 dark:text-zinc-300">General waste</div>
                  <div className="mt-2 text-2xl font-bold">5</div>
                </div>
                <div className="rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black">
                  <div className="text-xs text-zinc-600 dark:text-zinc-300">Recyclable</div>
                  <div className="mt-2 text-2xl font-bold">15</div>
                </div>
                <div className="rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black">
                  <div className="text-xs text-zinc-600 dark:text-zinc-300">Hazardous reported</div>
                  <div className="mt-2 text-2xl font-bold">10</div>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-black/[.08] bg-white p-4 text-sm text-zinc-700 dark:border-white/[.145] dark:bg-black dark:text-zinc-200">
                Complete a pickup to award points automatically.
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-16 flex flex-col items-start justify-between gap-2 border-t border-black/[.08] pt-6 text-xs text-zinc-600 dark:border-white/[.145] dark:text-zinc-400 md:flex-row md:items-center">
          <div>© {new Date().getFullYear()} Waste Collector</div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hover:text-zinc-900 dark:hover:text-zinc-50">
              Login
            </Link>
            <Link href="/signup" className="hover:text-zinc-900 dark:hover:text-zinc-50">
              Sign up
            </Link>
            <Link href="/dashboard" className="hover:text-zinc-900 dark:hover:text-zinc-50">
              Dashboard
            </Link>
          </div>
        </footer>
      </main>
    </div>
  )
}
