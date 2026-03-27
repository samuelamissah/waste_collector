import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ReportForm } from './form'

export default async function ReportPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/report')
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <header className="sticky top-0 z-10 border-b border-black/[.08] bg-zinc-50/80 backdrop-blur dark:border-white/[.145] dark:bg-black/70">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link className="text-sm font-semibold tracking-tight" href="/">
              Waste Collector
            </Link>
            <span className="rounded-full border border-black/[.08] bg-white px-3 py-1 text-xs text-zinc-700 dark:border-white/[.145] dark:bg-black dark:text-zinc-200">
              Report Issue
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              className="text-sm font-medium text-zinc-500 transition-colors hover:text-black dark:text-zinc-400 dark:hover:text-white"
              href="/reports"
            >
              My Reports
            </Link>
            <Link
              className="text-sm font-medium text-zinc-500 transition-colors hover:text-black dark:text-zinc-400 dark:hover:text-white"
              href="/dashboard"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Report an Issue</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Help us keep the community clean by reporting waste-related issues like illegal dumping, missed pickups, or overflowing bins.
          </p>
        </div>

        <div className="rounded-3xl border border-black/[.08] bg-white p-6 shadow-sm dark:border-white/[.145] dark:bg-black">
          <ReportForm />
        </div>
      </main>
    </div>
  )
}
