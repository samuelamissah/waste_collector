import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-28 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-green-500/20 blur-3xl dark:bg-green-500/10" />
        <div className="absolute -bottom-32 left-10 h-[420px] w-[420px] rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-400/10" />
      </div>

      <main className="relative mx-auto w-full max-w-6xl px-6 py-10 md:py-14">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Waste Collector
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg border border-black/[.08] px-4 py-2 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
            >
              Log in
            </Link>
            <Link href="/signup" className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white">
              Create account
            </Link>
          </div>
        </header>

        <section className="mt-14 grid items-center gap-12 md:mt-20 md:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-black/[.08] bg-white px-3 py-1 text-xs text-zinc-700 dark:border-white/[.145] dark:bg-black dark:text-zinc-200">
              <span className="h-1.5 w-1.5 rounded-full bg-green-700" />
              Cleaner cities, smarter pickups
            </div>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              Smart Waste Collection for Cleaner Cities
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
              Waste Collector connects residents, collectors, and city admins in one platform. Request on-demand pickups,
              earn rewards for recycling, and track progress in real time.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-lg bg-green-700 px-5 py-3 text-sm font-medium text-white"
              >
                Request Pickup
              </Link>
              <Link
                href="/collector-signup"
                className="inline-flex items-center justify-center rounded-lg border border-black/[.08] px-5 py-3 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
              >
                Become a Collector
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2 text-xs text-zinc-600 dark:text-zinc-300">
              <span className="rounded-full border border-black/[.08] bg-white px-3 py-1 dark:border-white/[.145] dark:bg-black">
                Built with Next.js + TailwindCSS
              </span>
              <span className="rounded-full border border-black/[.08] bg-white px-3 py-1 dark:border-white/[.145] dark:bg-black">
                Secure auth + roles
              </span>
              <span className="rounded-full border border-black/[.08] bg-white px-3 py-1 dark:border-white/[.145] dark:bg-black">
                Maps + reporting
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-black/[.08] bg-white p-6 shadow-sm dark:border-white/[.145] dark:bg-black">
            <div className="rounded-2xl bg-zinc-50 p-6 dark:bg-zinc-900/40">
              <div className="text-sm font-semibold">Today’s activity</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black">
                  <div className="text-xs text-zinc-600 dark:text-zinc-300">Pending pickups</div>
                  <div className="mt-2 text-2xl font-bold">24</div>
                </div>
                <div className="rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black">
                  <div className="text-xs text-zinc-600 dark:text-zinc-300">Collectors online</div>
                  <div className="mt-2 text-2xl font-bold">8</div>
                </div>
                <div className="rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black">
                  <div className="text-xs text-zinc-600 dark:text-zinc-300">Recycling points</div>
                  <div className="mt-2 text-2xl font-bold">1.2k</div>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-black/[.08] bg-white p-4 text-sm text-zinc-700 dark:border-white/[.145] dark:bg-black dark:text-zinc-200">
                Verify and complete pickups to automatically reward residents for proper sorting.
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14 md:mt-20">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Everything you need to keep waste moving</h2>
            <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
              A modern workflow for residents and field teams, designed for faster response times and cleaner neighborhoods.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-700 text-white">1</div>
              <div className="mt-4 text-lg font-semibold">On-demand pickup</div>
              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                Residents request pickups in seconds. Admins dispatch collectors and manage load with simple statuses.
              </div>
            </div>
            <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-700 text-white">2</div>
              <div className="mt-4 text-lg font-semibold">Recycling rewards</div>
              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                Encourage sorting with eco-points and simple incentives that keep participation high over time.
              </div>
            </div>
            <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-700 text-white">3</div>
              <div className="mt-4 text-lg font-semibold">Real-time tracking</div>
              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                Track request progress and view pickup locations on maps for clearer coordination and accountability.
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14 md:mt-20">
          <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black md:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Ready to get started?</h2>
                <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-300">
                  Request your first pickup or join as a collector to help your community stay clean.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-lg bg-green-700 px-5 py-3 text-sm font-medium text-white"
                >
                  Request Pickup
                </Link>
                <Link
                  href="/collector-signup"
                  className="inline-flex items-center justify-center rounded-lg border border-black/[.08] px-5 py-3 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                >
                  Become a Collector
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-black/[.08] py-8 text-xs text-zinc-600 dark:border-white/[.145] dark:text-zinc-400 md:flex-row md:items-center">
          <div>© {new Date().getFullYear()} Waste Collector</div>
          <div className="flex flex-wrap items-center gap-3">
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
