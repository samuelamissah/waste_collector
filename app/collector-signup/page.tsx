'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Swal from 'sweetalert2'
import { useToast } from '../components/toast'

export default function CollectorSignupPage() {
  const supabase = createClient()
  const router = useRouter()
  const toast = useToast()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: 'collector' },
      },
    })

    if (error) {
      const message = error.message
      const lower = message.toLowerCase()
      const isExistingAccount =
        lower.includes('already registered') ||
        lower.includes('already exists') ||
        lower.includes('user already') ||
        lower.includes('email address has already been registered') ||
        lower.includes('duplicate key') ||
        lower.includes('user_exists')

      if (isExistingAccount) {
        const result = await Swal.fire({
          icon: 'info',
          title: 'Account already exists',
          text: 'An account with this email already exists. Log in instead.',
          confirmButtonColor: '#15803d',
          confirmButtonText: 'Go to login',
          showCancelButton: true,
          cancelButtonText: 'Use a different email',
        })

        if (result.isConfirmed) router.push('/login')
        setLoading(false)
        return
      }

      toast.error(message, 'Sign up failed')
      setLoading(false)
      return
    }

    const identities = (data.user as unknown as { identities?: unknown })?.identities
    const identityCount = Array.isArray(identities) ? identities.length : null

    if (data.user && identityCount === 0) {
      const result = await Swal.fire({
        icon: 'info',
        title: 'Account already exists',
        text: 'An account with this email already exists. Log in instead.',
        confirmButtonColor: '#15803d',
        confirmButtonText: 'Go to login',
        showCancelButton: true,
        cancelButtonText: 'Use a different email',
      })

      if (result.isConfirmed) router.push('/login')
      setLoading(false)
      return
    }

    if (data.user && data.session) {
      const profileUpsert = await supabase
        .from('profiles')
        .upsert(
          {
            id: data.user.id,
            full_name: fullName,
            role: 'collector',
          },
          { onConflict: 'id' }
        )

      if (profileUpsert.error) {
        const message = profileUpsert.error.message
        const extra =
          message.toLowerCase().includes('row-level security') || message.toLowerCase().includes('rls')
            ? 'Your profiles table is blocking inserts. Apply the SQL in supabase_auth_profiles.sql in your Supabase SQL editor.'
            : 'Check that profiles has an insert policy for auth users, or use a database trigger to create profiles automatically.'

        toast.warning(`${message}\n\n${extra}`, 'Account created, but profile not saved')
      } else {
        const profileCheck = await supabase.from('profiles').select('id').eq('id', data.user.id).maybeSingle()

        if (profileCheck.error || !profileCheck.data) {
          toast.warning(
            profileCheck.error?.message ?? 'This is usually caused by missing Row Level Security policies on profiles.',
            'Account created, but profile not visible'
          )
        }
      }
    }

    if (!data.session) {
      toast.success(
        'Confirm your email, then come back to log in. Your profile will be created after you sign in.',
        'Check your email'
      )
    } else {
      toast.success('Redirecting you to login.', 'Account created')
    }

    router.push('/login')
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-green-500/20 blur-3xl" />
        <div className="absolute top-52 -right-20 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-32 left-0 h-96 w-96 rounded-full bg-lime-400/15 blur-3xl" />
      </div>

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
        <div className="flex items-center justify-between">
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
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md rounded-3xl border border-black/[.08] bg-white p-6 shadow-sm dark:border-white/[.145] dark:bg-black">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Create collector account</h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Sign up as a collector to receive assigned pickups.
              </p>
            </div>

            <form onSubmit={handleSignup} className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="fullName">
                  Full name
                </label>
                <input
                  id="fullName"
                  className="w-full rounded-lg border border-black/[.08] p-3 outline-none focus:border-green-700 dark:border-white/[.145] dark:bg-black"
                  placeholder="Your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

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
                  placeholder="Create a password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !fullName.trim() || !email.trim() || !password.trim()}
                className="w-full rounded-lg bg-green-700 px-4 py-3 text-white disabled:bg-zinc-300"
              >
                {loading ? 'Creating...' : 'Sign up'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-300">
              Need a resident account?{' '}
              <Link href="/signup" className="font-medium text-zinc-900 dark:text-zinc-50">
                Sign up as resident
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

