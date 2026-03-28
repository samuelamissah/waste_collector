'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useToast } from '../components/toast'

export default function LoginPage() {
  const supabase = createClient()
  const toast = useToast()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function checkUser() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          window.location.assign('/dashboard')
        } else {
          setCheckingAuth(false)
        }
      } catch (err) {
        console.error('Auth check failed:', err)
        setCheckingAuth(false)
      }
    }

    checkUser()
  }, [supabase])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message, 'Login failed')
        setLoading(false)
        return
      }

      if (!data.user) {
        toast.error('No user data received', 'Login failed')
        setLoading(false)
        return
      }

      window.location.assign('/dashboard')
    } catch (err: any) {
      console.error('Login error:', err)
      toast.error(err.message || 'An error occurred', 'Login failed')
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-green-500/20 blur-3xl" />
        <div className="absolute top-48 -left-24 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-lime-400/15 blur-3xl" />
      </div>

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
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
                  required
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
                  required
                />
              </div>

              <button
                className="w-full rounded-lg bg-green-700 px-4 py-3 text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
                disabled={loading || !email.trim() || !password.trim()}
                type="submit"
              >
                {loading ? 'Signing in...' : 'Log in'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
              Don’t have an account?{' '}
              <Link href="/signup" className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}