import { createClient } from '@/lib/supabase/server'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type ReportRow = {
  id: string
  user_id: string
  type?: string | null
  description?: string | null
  message?: string | null
  status?: string | null
  created_at?: string | null
}

type ProfileRow = {
  role?: string | null
  full_name?: string | null
}

function formatDate(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

function labelForReportType(value: string | null | undefined) {
  const v = String(value ?? '').trim()
  if (!v) return ''
  if (v === 'illegal_dumping') return 'Illegal dumping'
  if (v === 'missed_pickup') return 'Missed pickup'
  if (v === 'overflowing_public_bin') return 'Overflowing public bin'
  if (v === 'other') return 'Other'
  return v
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

function parseLegacyMessage(value: string | null | undefined) {
  const raw = String(value ?? '').trim()
  if (!raw) return { type: '', description: '' }

  const match = raw.match(/^\[([^\]]+)\]\s*(.*)$/)
  if (!match) return { type: '', description: raw }

  return {
    type: match[1] ?? '',
    description: (match[2] ?? '').trim() || raw,
  }
}

function normalizeRole(rawRole: string | null | undefined) {
  const role = String(rawRole ?? '').trim().toLowerCase()
  if (role === 'admin') return 'admin'
  if (role === 'collector') return 'collector'
  return 'resident'
}

function statusLabel(rawStatus: string | null | undefined) {
  const status = String(rawStatus ?? '').trim().toLowerCase()
  if (status === 'resolved') return 'Resolved'
  return 'Open'
}

function statusClasses(rawStatus: string | null | undefined) {
  const status = String(rawStatus ?? '').trim().toLowerCase()
  if (status === 'resolved') {
    return 'border-green-200 bg-green-50 text-green-700'
  }
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>
}) {
  noStore()
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login?next=/reports')
  }

  const metadata = user.user_metadata as Record<string, unknown>

  const profileResult = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  let profile = (profileResult.data ?? null) as ProfileRow | null
  let profileReadError = profileResult.error?.message ?? null

  const metadataName =
    (typeof metadata?.full_name === 'string' && metadata.full_name.trim()
      ? metadata.full_name.trim()
      : typeof metadata?.name === 'string' && metadata.name.trim()
        ? metadata.name.trim()
        : null) ?? null

  const metadataRole =
    typeof metadata?.role === 'string' && metadata.role.trim()
      ? metadata.role.trim()
      : 'resident'

  if (!profile && !profileReadError) {
    const inferredRole = normalizeRole(metadataRole)

    await supabase.from('profiles').upsert(
      {
        id: user.id,
        full_name: metadataName,
        role: inferredRole,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )

    const refetch = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .maybeSingle()

    profile = (refetch.data ?? null) as ProfileRow | null
    profileReadError = refetch.error?.message ?? null
  }

  const role = normalizeRole(profile?.role ?? metadataRole)
  const displayName = profile?.full_name?.trim() ? profile.full_name : metadataName ?? 'User'
  const roleLabel = role === 'admin' ? 'Admin' : role === 'collector' ? 'Collector' : 'Resident'

  const sp = (await Promise.resolve(searchParams)) ?? {}
  const submitted = sp.submitted === '1'
  const updated = sp.updated === '1'
  const error = typeof sp.error === 'string' ? sp.error : ''

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

    if (!reportType || !description) {
      redirect('/reports?error=missing_fields')
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login?next=/reports')
    }

    const profileResult = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const metadata = user.user_metadata as Record<string, unknown>
    const currentRole = normalizeRole(
      profileResult.data?.role ??
        (typeof metadata?.role === 'string' ? metadata.role : 'resident')
    )

    if (currentRole === 'admin') {
      redirect('/reports?error=admin_cannot_submit')
    }

    const structuredInsert = await supabase
      .from('reports')
      .insert({
        user_id: user.id,
        type: reportType,
        description,
        status: 'open',
      } as Record<string, unknown>)

    const insert =
      structuredInsert.error &&
      structuredInsert.error.message.toLowerCase().includes('column') &&
      (
        structuredInsert.error.message.toLowerCase().includes('type') ||
        structuredInsert.error.message.toLowerCase().includes('description') ||
        structuredInsert.error.message.toLowerCase().includes('status')
      )
        ? await supabase
            .from('reports')
            .insert({ user_id: user.id, message: `[${reportType}] ${description}` })
        : structuredInsert

    if (insert.error) {
      redirect('/reports?error=insert_failed')
    }

    revalidatePath('/reports')
    revalidatePath('/dashboard')
    revalidatePath('/collector')
    revalidatePath('/admin')
    redirect('/reports?submitted=1')
  }

  async function updateReportStatus(formData: FormData) {
    'use server'

    const reportId = String(formData.get('reportId') ?? '').trim()
    const nextStatus = String(formData.get('nextStatus') ?? '').trim().toLowerCase()

    if (!reportId || !['open', 'resolved'].includes(nextStatus)) {
      redirect('/reports?error=invalid_status_update')
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login?next=/reports')
    }

    const profileResult = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const metadata = user.user_metadata as Record<string, unknown>
    const currentRole = normalizeRole(
      profileResult.data?.role ??
        (typeof metadata?.role === 'string' ? metadata.role : 'resident')
    )

    if (currentRole !== 'admin') {
      redirect('/reports?error=not_authorized')
    }

    const updateResult = await supabase
      .from('reports')
      .update({ status: nextStatus } as Record<string, unknown>)
      .eq('id', reportId)

    if (updateResult.error) {
      redirect('/reports?error=status_update_failed')
    }

    revalidatePath('/reports')
    revalidatePath('/dashboard')
    revalidatePath('/collector')
    revalidatePath('/admin')
    redirect('/reports?updated=1')
  }

  const reportsQuery = supabase
    .from('reports')
    .select('id, user_id, type, description, message, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  const reportsResult =
    role === 'admin'
      ? await reportsQuery
      : await reportsQuery.eq('user_id', user.id)

  const reportsErrorMessage = reportsResult.error?.message?.toLowerCase() ?? ''

  const fallbackReportsResult =
    reportsResult.error &&
    reportsErrorMessage.includes('column') &&
    (
      reportsErrorMessage.includes('type') ||
      reportsErrorMessage.includes('description') ||
      reportsErrorMessage.includes('status') ||
      reportsErrorMessage.includes('message')
    )
      ? role === 'admin'
        ? await supabase
            .from('reports')
            .select('id, user_id, message, created_at')
            .order('created_at', { ascending: false })
            .limit(100)
        : await supabase
            .from('reports')
            .select('id, user_id, message, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(100)
      : null

  const reportsReadError = fallbackReportsResult
    ? fallbackReportsResult.error?.message ?? null
    : reportsResult.error?.message ?? null

  const reports = ((fallbackReportsResult?.data ?? reportsResult.data ?? []) as unknown) as ReportRow[]

  const reporterIds = role === 'admin' ? [...new Set(reports.map((r) => r.user_id))] : []
  const reporterProfilesResult =
    role === 'admin' && reporterIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', reporterIds)
      : await Promise.resolve({
          data: [] as Array<{ id: string; full_name: string | null }>,
        })

  const reporterNameById = new Map(
    (reporterProfilesResult.data ?? []).map((p) => [
      p.id,
      p.full_name?.trim() ? p.full_name : 'User',
    ])
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
            Could not fully read your profile: {profileReadError}
          </div>
        )}

        <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{displayName}</div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
            {role === 'admin'
              ? 'Review all reports and mark them open or resolved.'
              : 'Submit reports and track their current status.'}
          </p>

          {submitted && (
            <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Report submitted successfully.
            </div>
          )}

          {updated && (
            <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Report status updated.
            </div>
          )}

          {error === 'missing_fields' && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Please select a report type and enter a description.
            </div>
          )}

          {error === 'insert_failed' && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Could not submit the report.
            </div>
          )}

          {error === 'invalid_status_update' && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Invalid report status update.
            </div>
          )}

          {error === 'status_update_failed' && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Could not update report status.
            </div>
          )}

          {error === 'not_authorized' && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              You are not authorized to update report status.
            </div>
          )}

          {error === 'admin_cannot_submit' && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Admin users cannot submit reports from this page.
            </div>
          )}

          {reportsReadError && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Could not load reports: {reportsReadError}
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
                    name="type"
                    defaultValue=""
                    className="w-full rounded-lg border border-black/[.08] bg-white p-3 dark:border-white/[.145] dark:bg-black"
                  >
                    <option value="" disabled>
                      Select type
                    </option>
                    <option value="illegal_dumping">Illegal dumping</option>
                    <option value="missed_pickup">Missed pickup</option>
                    <option value="overflowing_public_bin">Overflowing public bin</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="description">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={6}
                    placeholder="Describe what happened and where"
                    className="w-full rounded-lg border border-black/[.08] bg-white p-3 dark:border-white/[.145] dark:bg-black"
                  />
                </div>

                <button className="w-full rounded-lg bg-green-700 px-4 py-3 text-white" type="submit">
                  Submit report
                </button>
              </form>
            </div>
          )}

          <div
            className={`rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black ${
              role === 'admin' ? 'md:col-span-3' : 'md:col-span-2'
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {role === 'admin' ? 'All reports' : 'Your reports'}
              </h2>

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
                reports.map((r) => {
                  const legacy = parseLegacyMessage(r.message)
                  const reportType = labelForReportType(r.type) || labelForReportType(legacy.type)
                  const description =
                    r.description?.trim()
                      ? r.description
                      : legacy.description || r.message || ''

                  const currentStatus = String(r.status ?? 'open').trim().toLowerCase() || 'open'
                  const nextStatus = currentStatus === 'resolved' ? 'open' : 'resolved'

                  return (
                    <div key={r.id} className="rounded-2xl border border-black/[.08] p-4 dark:border-white/[.145]">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium">
                            {role === 'admin' ? reporterNameById.get(r.user_id) ?? 'User' : 'You'}
                          </div>
                          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                            {formatDate(r.created_at)}
                          </div>
                        </div>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${statusClasses(currentStatus)}`}
                        >
                          {statusLabel(currentStatus)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-start gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                        {reportType && (
                          <span className="rounded-full border border-black/[.08] bg-white px-2 py-0.5 text-xs text-zinc-700 dark:border-white/[.145] dark:bg-black dark:text-zinc-200">
                            {reportType}
                          </span>
                        )}
                        <span>{description}</span>
                      </div>

                      {role === 'admin' && (
                        <div className="mt-4">
                          <form action={updateReportStatus}>
                            <input type="hidden" name="reportId" value={r.id} />
                            <input type="hidden" name="nextStatus" value={nextStatus} />
                            <button
                              type="submit"
                              className="rounded-lg border border-black/[.08] px-4 py-2 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                            >
                              Mark as {nextStatus === 'resolved' ? 'resolved' : 'open'}
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}