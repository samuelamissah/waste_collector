import { createClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type PickupRequestRow = {
  id: string
  user_id: string
  bin_id: string | null
  address?: string | null
  waste_type: string | null
  status: string | null
  created_at?: string | null
}

function titleForWasteType(wasteType: string | null | undefined) {
  if (wasteType === 'recyclable') return 'Recyclable'
  if (wasteType === 'hazardous') return 'Hazardous'
  if (wasteType === 'general') return 'General'
  return wasteType ?? 'Unknown'
}

function titleForStatus(status: string | null | undefined) {
  if (!status) return 'unknown'
  return status.replaceAll('_', ' ')
}

function formatDate(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}) {
  noStore()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/requests')

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  const sp = (await Promise.resolve(searchParams)) ?? {}
  const submittedParam = sp.submitted
  const submitted = typeof submittedParam === 'string' ? submittedParam === '1' : false
  const statusParam = sp.status
  const status =
    typeof statusParam === 'string' && statusParam.trim() ? statusParam.trim() : 'all'

  const profileFetch = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  const profileRow = profileFetch.data ?? null
  const role = profileRow?.role ?? 'user'
  const roleLabel = role === 'admin' ? 'Admin' : role === 'collector' ? 'Collector' : 'Resident'

  const metadata = user.user_metadata as Record<string, unknown>
  const metadataName =
    (typeof metadata?.full_name === 'string' && metadata.full_name.trim()
      ? metadata.full_name.trim()
      : typeof metadata?.name === 'string' && metadata.name.trim()
        ? metadata.name.trim()
        : null) ?? null
  const displayName = profileRow?.full_name?.trim() ? profileRow.full_name : metadataName ?? 'User'

  const baseQuery = supabase
    .from('pickup_requests')
    .select('id, user_id, bin_id, address, waste_type, status, created_at')

  // Admins see all requests, users see only their own
  if (role !== 'admin') {
    baseQuery.eq('user_id', user.id)
  }
  
  baseQuery.order('created_at', { ascending: false }).limit(100)

  const { data: requestRows } =
    status === 'all' ? await baseQuery : await baseQuery.eq('status', status)

  const requests = (requestRows ?? []) as PickupRequestRow[]
  const binIds = [...new Set(requests.map((r) => r.bin_id).filter((v): v is string => !!v && isUuid(v)))]
  const { data: bins, error: binsError } =
    binIds.length > 0
      ? await supabase.from('bins').select('id, code').in('id', binIds)
      : await Promise.resolve({ data: [] as Array<{ id: string; code: string | null }>, error: null as unknown })

  const binCodeById = new Map<string, string>(
    !binsError ? (bins ?? []).map((b) => [b.id, (b.code ?? '').trim() ? (b.code as string).trim() : '']) : []
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
        <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <h1 className="text-2xl font-bold tracking-tight">Welcome, {displayName}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Review your pickup request history and current statuses.
          </p>
          {submitted && (
            <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Pickup request submitted.
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white" href="/dashboard?section=request-pickup">
              Request pickup
            </Link>
            <Link
              className="rounded-lg border border-black/[.08] px-4 py-2 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
              href="/dashboard?section=bin-info"
            >
              Bin info
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Request history</h2>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Filter and track your requests.
              </div>
            </div>
            <div className="flex items-center gap-2">
            <form method="get" className="flex items-center gap-2">
              <select
                className="rounded-lg border border-black/[.08] bg-white px-3 py-2 dark:border-white/[.145] dark:bg-black"
                name="status"
                defaultValue={status}
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="verified">Verified</option>
                <option value="completed">Completed</option>
              </select>
              <button
                className="rounded-lg border border-black/[.08] px-3 py-2 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                type="submit"
              >
                Filter
              </button>
            </form>
          </div>
          </div>
        </div>

        <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/[.08] text-zinc-600 dark:border-white/[.145] dark:text-zinc-300">
                  <th className="py-3 pr-4 font-medium">Ref</th>
                  <th className="py-3 pr-4 font-medium">Bin</th>
                  <th className="py-3 pr-4 font-medium">Waste type</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td className="py-6 text-zinc-600 dark:text-zinc-300" colSpan={5}>
                      No requests yet.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="border-b border-black/[.08] dark:border-white/[.145]">
                      <td className="py-4 pr-4">{r.id.slice(0, 8)}</td>
                      <td className="py-4 pr-4">
                        {r.bin_id
                          ? binCodeById.get(r.bin_id)?.trim()
                            ? binCodeById.get(r.bin_id)
                            : 'Unregistered bin'
                          : '—'}
                      </td>
                      <td className="py-4 pr-4">{titleForWasteType(r.waste_type)}</td>
                      <td className="py-4 pr-4">
                        <span className="rounded-full border border-black/[.08] bg-white px-3 py-1 text-xs text-zinc-700 dark:border-white/[.145] dark:bg-black dark:text-zinc-200">
                          {titleForStatus(r.status)}
                        </span>
                        {r.status === 'verified' && (
                          <div className="mt-2 text-xs font-medium text-green-600 dark:text-green-400">
                            In Progress
                          </div>
                        )}
                      </td>
                      <td className="py-4 pr-4">{formatDate(r.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

