'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    const params = new URLSearchParams(window.location.search)
    const next = params.get('next') ?? '/dashboard'
    router.push(next.startsWith('/') ? next : '/dashboard')
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Waste Collector
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/signup"
              className="rounded-lg border border-black/[.08] px-4 py-2 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
            >
              Create account
            </Link>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md rounded-3xl border border-black/[.08] bg-white p-6 shadow-sm dark:border-white/[.145] dark:bg-black">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Log in</h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Sign in to access your dashboard.
              </p>
            </div>

            {errorMessage && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  className="w-full rounded-lg border border-black/[.08] p-3 outline-none focus:border-green-700 dark:border-white/[.145] dark:bg-black"
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  className="w-full rounded-lg border border-black/[.08] p-3 outline-none focus:border-green-700 dark:border-white/[.145] dark:bg-black"
                  placeholder="Your password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                className="w-full rounded-lg bg-green-700 px-4 py-3 text-white disabled:bg-zinc-300"
                disabled={loading || !email.trim() || !password.trim()}
                type="submit"
              >
                {loading ? 'Signing in...' : 'Log in'}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-black/[.08] bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-white/[.145] dark:bg-zinc-900/40 dark:text-zinc-200">
              <div className="font-semibold">Admin login</div>
              <div className="mt-1">
                Admin access is role-based. Set <span className="font-medium">profiles.role</span> to{' '}
                <span className="font-medium">admin</span> for your user in Supabase, then log in
                normally.
              </div>
            </div>

            <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
              Don’t have an account?{' '}
              <Link href="/signup" className="font-medium text-zinc-900 dark:text-zinc-50">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
