import { createClient } from '@/lib/supabase/server'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type ReportRow = {
  id: string
  user_id: string
  message: string | null
  created_at?: string | null
}

function formatDate(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}) {
  noStore()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/reports')

  const initialProfileFetch = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  const profileRow = initialProfileFetch.data ?? null
  let profileReadError = initialProfileFetch.error?.message ?? null
  let role = profileRow?.role ?? 'user'
  let fullName = profileRow?.full_name ?? null

  if (!profileRow && !profileReadError) {
    const metadata = user.user_metadata as Record<string, unknown>
    const fullNameFromMetadata =
      (typeof metadata?.full_name === 'string' && metadata.full_name.trim()
        ? metadata.full_name.trim()
        : typeof metadata?.name === 'string' && metadata.name.trim()
          ? metadata.name.trim()
          : null) ?? null

    await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          full_name: fullNameFromMetadata,
          role: 'user',
        },
        { onConflict: 'id', ignoreDuplicates: true }
      )

    const refetch = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .maybeSingle()

    role = refetch.data?.role ?? role
    fullName = refetch.data?.full_name ?? fullName
    profileReadError = refetch.error?.message ?? null
  }

  const roleLabel = role === 'admin' ? 'Admin' : role === 'collector' ? 'Collector' : 'Resident'
  const metadata = user.user_metadata as Record<string, unknown>
  const metadataName =
    (typeof metadata?.full_name === 'string' && metadata.full_name.trim()
      ? metadata.full_name.trim()
      : typeof metadata?.name === 'string' && metadata.name.trim()
        ? metadata.name.trim()
        : null) ?? null

  const displayName = fullName?.trim() ? fullName : metadataName ?? 'User'
  const sp = (await Promise.resolve(searchParams)) ?? {}
  const submittedParam = sp.submitted
  const submitted = typeof submittedParam === 'string' ? submittedParam === '1' : false

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  async function submitReport(formData: FormData) {
    'use server'
    const reportType = String(formData.get('type') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()
    if (!reportType || !description) return

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const message = `[${reportType}] ${description}`
    const insert = await supabase.from('reports').insert({ user_id: user.id, message })
    if (insert.error) return

    revalidatePath('/reports')
    revalidatePath('/dashboard')
    redirect('/reports?submitted=1')
  }

  const baseQuery = supabase
    .from('reports')
    .select('id, user_id, message, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: reportsData } =
    role === 'admin' ? await baseQuery : await baseQuery.eq('user_id', user.id)

  const reports = (reportsData ?? []) as ReportRow[]
  const reporterIds = role === 'admin' ? [...new Set(reports.map((r) => r.user_id))] : []
  const { data: reporterProfiles } =
    role === 'admin' && reporterIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', reporterIds)
      : await Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null }> })

  const reporterNameById = new Map(
    (reporterProfiles ?? []).map((p) => [p.id, p.full_name?.trim() ? p.full_name : 'User'])
  )

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <header className="sticky top-0 z-10 border-b border-black/[.08] bg-zinc-50/80 backdrop-blur dark:border-white/[.145] dark:bg-black/70">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link className="text-sm font-semibold tracking-tight" href="/">
              Waste Collector
            </Link>
            <span className="rounded-full border border-black/[.08] bg-white px-3 py-1 text-xs text-zinc-700 dark:border-white/[.145] dark:bg-black dark:text-zinc-200">
              {roleLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg border border-black/[.08] px-4 py-2 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
            >
              Dashboard
            </Link>
            <Link
              href="/requests"
              className="rounded-lg border border-black/[.08] px-4 py-2 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
            >
              History
            </Link>
            <Link
              href="/reports"
              className="rounded-lg border border-black/[.08] px-4 py-2 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
            >
              Reports
            </Link>
            <Link
              href="/profile"
              className="rounded-lg border border-black/[.08] px-4 py-2 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
            >
              Profile
            </Link>
            <form action={signOut}>
              <button className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-6 px-6 py-8">
        {profileReadError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Could not read your profile from the database: {profileReadError}. If this mentions a missing column
            (for example profiles.bin_id), run supabase_profiles_schema.sql. If it mentions RLS, run
            supabase_auth_profiles.sql. Then refresh.
          </div>
        )}
        <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{displayName}</div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
            Report illegal dumping, missed pickup, or overflowing public bins.
          </p>
          {submitted && (
            <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Report submitted.
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {role !== 'admin' && (
            <div className="rounded-3xl border border-black/[.08] bg-white p-6 md:col-span-1 dark:border-white/[.145] dark:bg-black">
              <h2 className="text-lg font-semibold">Submit a report</h2>
              <form action={submitReport} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="type">
                    Type
                  </label>
                  <select
                    id="type"
                    className="w-full rounded-lg border border-black/[.08] bg-white p-3 dark:border-white/[.145] dark:bg-black"
                    name="type"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select type
                    </option>
                    <option value="illegal_dumping">Illegal dumping</option>
                    <option value="missed_pickup">Missed pickup</option>
                    <option value="overflowing_public_bin">Overflowing public bin</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="description">
                    Description
                  </label>
                  <textarea
                    id="description"
                    className="w-full rounded-lg border border-black/[.08] bg-white p-3 dark:border-white/[.145] dark:bg-black"
                    name="description"
                    placeholder="Describe what happened and where"
                    rows={6}
                  />
                </div>

                <button className="w-full rounded-lg bg-green-700 px-4 py-3 text-white" type="submit">
                  Submit report
                </button>
              </form>
            </div>
          )}

          <div className="rounded-3xl border border-black/[.08] bg-white p-6 md:col-span-2 dark:border-white/[.145] dark:bg-black">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{role === 'admin' ? 'All reports' : 'Your reports'}</h2>
              <Link
                href="/dashboard"
                className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                Back to dashboard
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {reports.length === 0 ? (
                <div className="text-sm text-zinc-600 dark:text-zinc-300">No reports yet.</div>
              ) : (
                reports.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-black/[.08] p-4 dark:border-white/[.145]">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm font-medium">
                        {role === 'admin' ? reporterNameById.get(r.user_id) ?? 'User' : 'You'}
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-300">{formatDate(r.created_at ?? null)}</div>
                    </div>
                    <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">{r.message ?? ''}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
