import { createClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { assignCollector, signOut } from './actions'
import AdminAnalytics from '@/app/components/admin-analytics'

type PickupRequestRow = {
  id: string
  address?: string | null
  waste_type: string | null
  status: string | null
  created_at?: string | null
  assigned_collector_id?: string | null
  user_id: string
  start_location_lat?: number | null
  start_location_lng?: number | null
  bins?: { code: string } | null
  profiles?: { full_name: string | null } | null
}

type ReportRow = {
  id: string
  user_id: string
  type?: string | null
  description?: string | null
  message?: string | null
  status?: string | null
  created_at?: string | null
  profiles?: { full_name: string | null } | null
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

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}) {
  noStore()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/admin')

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profileRow?.role !== 'admin') {
    redirect('/dashboard')
  }

  const sp = (await Promise.resolve(searchParams)) ?? {}
  const statusFilter = typeof sp.status === 'string' ? sp.status : 'all'
  const section = typeof sp.section === 'string' ? sp.section : 'requests'

  // Fetch Stats and Data in Parallel
  let requestsQuery = supabase
    .from('pickup_requests')
    .select(`
      id, address, waste_type, status, created_at, assigned_collector_id, user_id, start_location_lat, start_location_lng,
      bins(code),
      profiles!pickup_requests_user_id_fkey(full_name)
    `)
    .order('created_at', { ascending: false })

  if (statusFilter !== 'all') {
    requestsQuery = requestsQuery.eq('status', statusFilter)
  }

  const [
    { count: pendingCount },
    { count: activeCollectors },
    { count: totalRequests },
    { count: totalReports },
    { data: requestRows },
    { data: collectors },
    { data: reportRows },
    analyticsDataResult
  ] = await Promise.all([
    supabase.from('pickup_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'collector'),
    supabase.from('pickup_requests').select('*', { count: 'exact', head: true }),
    supabase.from('reports').select('*', { count: 'exact', head: true }),
    requestsQuery,
    supabase.from('profiles').select('id, full_name').eq('role', 'collector').order('full_name'),
    supabase.from('reports').select(`
      id, user_id, type, description, message, status, created_at,
      profiles(full_name)
    `).order('created_at', { ascending: false }),
    section === 'analytics' ? Promise.all([
        supabase.from('pickup_requests').select('waste_type, status, created_at, address'),
        supabase.from('profiles').select('eco_points')
    ]) : Promise.resolve(null)
  ])

  const requests = (requestRows ?? []).map((r) => ({
    ...r,
    bins: Array.isArray(r.bins) ? r.bins[0] : r.bins,
    profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
  })) as PickupRequestRow[]

  const reports = (reportRows ?? []).map((r) => ({
    ...r,
    profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
  })) as ReportRow[]

  // Process Analytics Data if section is analytics
  let analyticsData = null
  if (section === 'analytics' && analyticsDataResult) {
    type AnalyticsRequestRow = {
      waste_type: string | null
      status: string | null
      created_at?: string | null
      address?: string | null
    }
    type ProfileEco = { eco_points?: number | null }
    const [{ data: allRequests }, { data: allProfiles }] = analyticsDataResult as [
      { data: AnalyticsRequestRow[] | null },
      { data: ProfileEco[] | null }
    ]
    
    // Process data
    const completedRequests = allRequests?.filter((r: AnalyticsRequestRow) => r.status === 'completed') || []
    const totalPickups = completedRequests.length
    const recyclableCount = completedRequests.filter((r: AnalyticsRequestRow) => r.waste_type === 'recyclable').length
    const recyclingRate = totalPickups > 0 ? (recyclableCount / totalPickups) * 100 : 0
    
    const totalEcoPoints =
      allProfiles?.reduce((sum: number, p: ProfileEco) => sum + (p.eco_points || 0), 0) ?? 0

    // Waste Type Distribution (using all requests to show demand)
    const wasteTypeMap = new Map<string, number>()
    allRequests?.forEach((r: AnalyticsRequestRow) => {
      const type = r.waste_type ? titleForWasteType(r.waste_type) : 'Unknown'
      wasteTypeMap.set(type, (wasteTypeMap.get(type) || 0) + 1)
    })
    const wasteTypeDistribution = Array.from(wasteTypeMap.entries()).map(([name, value]) => ({ name, value }))

    // Pickups Over Time
    const pickupsByDate = new Map<string, number>()
    allRequests?.forEach((r: AnalyticsRequestRow) => {
      if (!r.created_at) return
      const date = new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      pickupsByDate.set(date, (pickupsByDate.get(date) || 0) + 1)
    })
    const pickupsOverTime = Array.from(pickupsByDate.entries()).map(([date, count]) => ({ date, count }))
    pickupsOverTime.reverse()

    // Top Locations
    const locationMap = new Map<string, number>()
    allRequests?.forEach((r: AnalyticsRequestRow) => {
      const addr = r.address || 'Unknown'
      locationMap.set(addr, (locationMap.get(addr) || 0) + 1)
    })
    const topLocations = Array.from(locationMap.entries())
      .map(([address, count]) => ({ address, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    analyticsData = {
      totalPickups,
      recyclingRate,
      totalEcoPoints,
      wasteTypeDistribution,
      pickupsOverTime,
      topLocations
    }
  }

  const displayName = profileRow?.full_name?.trim() ? profileRow.full_name : 'Admin'

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <header className="sticky top-0 z-10 border-b border-black/[.08] bg-zinc-50/80 backdrop-blur dark:border-white/[.145] dark:bg-black/70">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link className="text-sm font-semibold tracking-tight" href="/">
              Waste Collector
            </Link>
            <span className="rounded-full border border-black/[.08] bg-purple-100 px-3 py-1 text-xs text-purple-700 dark:border-white/[.145] dark:bg-purple-900/30 dark:text-purple-300">
              Admin Dashboard
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg border border-black/[.08] px-4 py-2 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
            >
              Resident View
            </Link>
            <form action={signOut}>
              <button
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
                type="submit"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-8 px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Requests</div>
            <div className="mt-2 text-3xl font-bold">{totalRequests ?? 0}</div>
          </div>
          <div className="rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Pending Requests</div>
            <div className="mt-2 text-3xl font-bold text-amber-600">{pendingCount ?? 0}</div>
          </div>
          <div className="rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Active Collectors</div>
            <div className="mt-2 text-3xl font-bold text-blue-600">{activeCollectors ?? 0}</div>
          </div>
          <div className="rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Reports</div>
            <div className="mt-2 text-3xl font-bold text-purple-600">{totalReports ?? 0}</div>
          </div>
        </div>

        <div className="flex items-center gap-4 border-b border-black/[.08] pb-1 dark:border-white/[.145]">
          <Link
            href="/admin?section=requests"
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              section === 'requests'
                ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Pickup Requests
          </Link>
          <Link
            href="/admin?section=reports"
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              section === 'reports'
                ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            User Reports
          </Link>
          <Link
            href="/admin?section=analytics"
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              section === 'analytics'
                ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Analytics
          </Link>
        </div>

        {section === 'requests' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Manage Requests</h2>
              <form className="flex items-center gap-2" method="get">
                <input type="hidden" name="section" value="requests" />
                <select
                  title='Filter requests by status'
                  name="status"
                  defaultValue={statusFilter}
                  className="rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm dark:border-white/[.145] dark:bg-black"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="verified">Verified</option>
                  <option value="completed">Completed</option>
                </select>
                <button
                  type="submit"
                  className="rounded-lg border border-black/[.08] px-3 py-2 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                >
                  Filter
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-black/[.08] bg-white overflow-hidden dark:border-white/[.145] dark:bg-black">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-900/50">
                    <tr>
                      <th className="px-6 py-4 font-medium">User / Address</th>
                      <th className="px-6 py-4 font-medium">Details</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">Assigned Collector</th>
                      <th className="px-6 py-4 font-medium">Tracking</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[.08] dark:divide-white/[.145]">
                    {requests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                          No requests found.
                        </td>
                      </tr>
                    ) : (
                      requests.map((r) => (
                        <tr key={r.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                          <td className="px-6 py-4">
                            <div className="font-medium">{r.profiles?.full_name || 'Unknown User'}</div>
                            <div className="text-xs text-zinc-500">{r.address || 'No address provided'}</div>
                            <div className="text-xs text-zinc-400 mt-1">{formatDate(r.created_at)}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div>{titleForWasteType(r.waste_type)}</div>
                            {r.bins?.code && (
                              <div className="mt-1 font-mono text-xs text-zinc-500">Bin: {r.bins.code}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                                r.status === 'completed'
                                  ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/30 dark:bg-green-900/10 dark:text-green-400'
                                  : r.status === 'verified'
                                    ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-400'
                                    : r.status === 'assigned'
                                      ? 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/30 dark:bg-purple-900/10 dark:text-purple-400'
                                      : 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/10 dark:text-zinc-400'
                              }`}
                            >
                              {titleForStatus(r.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <form action={assignCollector} className="flex items-center gap-2">
                              <input type="hidden" name="requestId" value={r.id} />
                              <select
                                title='Assign collector to request'
                                name="collectorId"
                                defaultValue={r.assigned_collector_id || ''}
                                className="w-40 rounded-lg border border-black/[.08] bg-transparent px-2 py-1 text-sm outline-none focus:border-black/30 dark:border-white/[.145] dark:focus:border-white/30"
                                disabled={r.status === 'completed'}
                              >
                                <option value="">Unassigned</option>
                                {collectors?.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.full_name}
                                  </option>
                                ))}
                              </select>
                              {r.status !== 'completed' && (
                                <button
                                  type="submit"
                                  className="rounded-md bg-black px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                                >
                                  Save
                                </button>
                              )}
                            </form>
                          </td>
                          <td className="px-6 py-4">
                            {r.start_location_lat && r.start_location_lng ? (
                              <div className="text-xs">
                                <div className="font-medium text-green-600 dark:text-green-400">Tracked</div>
                                <a
                                  href={`https://www.google.com/maps?q=${r.start_location_lat},${r.start_location_lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 underline hover:text-blue-500"
                                >
                                  View Map
                                </a>
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-400">No data</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {section === 'reports' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">User Reports</h2>
            <div className="rounded-3xl border border-black/[.08] bg-white overflow-hidden dark:border-white/[.145] dark:bg-black">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-900/50">
                    <tr>
                      <th className="px-6 py-4 font-medium">User</th>
                      <th className="px-6 py-4 font-medium">Type</th>
                      <th className="px-6 py-4 font-medium">Description</th>
                      <th className="px-6 py-4 font-medium">Date</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[.08] dark:divide-white/[.145]">
                    {reports.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                          No reports found.
                        </td>
                      </tr>
                    ) : (
                      reports.map((r) => (
                        <tr key={r.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                          <td className="px-6 py-4 font-medium">{r.profiles?.full_name || 'Unknown User'}</td>
                          <td className="px-6 py-4 capitalize">{r.type?.replaceAll('_', ' ') || 'General'}</td>
                          <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                            {r.description || r.message || 'No description'}
                          </td>
                          <td className="px-6 py-4 text-zinc-500">{formatDate(r.created_at)}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center rounded-full border border-black/[.08] bg-white px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:border-white/[.145] dark:bg-black dark:text-zinc-200">
                              {r.status || 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {section === 'analytics' && analyticsData && (
          <AdminAnalytics data={analyticsData} />
        )}
      </main>
    </div>
  )
}