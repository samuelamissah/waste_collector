import { createClient } from '@/lib/supabase/server'
import PickupForm from '@/app/components/pickup-form'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import QRCode from 'qrcode'

type Profile = {
  id: string
  full_name: string | null
  role: string | null
  eco_points: number | null
  bin_id?: string | null
}

type PickupRequest = {
  id: string
  user_id: string
  bin_id: string | null
  address?: string | null
  waste_type: string | null
  status: string | null
  assigned_collector_id?: string | null
  created_at?: string | null
}

type Report = {
  id: string
  user_id: string
  type?: string | null
  description?: string | null
  message?: string | null
  created_at?: string | null
}

function pointsForWasteType(wasteType: string | null | undefined) {
  if (wasteType === 'recyclable') return 15
  if (wasteType === 'hazardous') return 10
  return 5
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id, full_name, role, eco_points, bin_id')
    .eq('id', user.id)
    .maybeSingle()

  const profile = (profileRow ?? null) as Profile | null
  const role = profile?.role ?? 'user'

  async function verifyPickup(formData: FormData) {
    'use server'
    const requestId = String(formData.get('requestId') ?? '')
    const binCode = String(formData.get('binCode') ?? '').trim()
    if (!requestId) return

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const isCollector = profileRow?.role === 'collector'
    const isAdmin = profileRow?.role === 'admin'
    if (!isCollector && !isAdmin) return

    const { data: requestRow } = await supabase
      .from('pickup_requests')
      .select('id, assigned_collector_id, status, bin_id')
      .eq('id', requestId)
      .maybeSingle()

    if (!requestRow) return
    if (!isAdmin && requestRow.assigned_collector_id !== user.id) return
    if (requestRow.status === 'completed') return
    if (!isAdmin) {
      const expectedBin = String(requestRow.bin_id ?? '').trim()
      if (!expectedBin || binCode !== expectedBin) {
        redirect('/dashboard?error=bin_code_mismatch')
      }
    }

    await supabase
      .from('pickup_requests')
      .update({ status: 'verified' })
      .eq('id', requestId)

    revalidatePath('/dashboard')
  }

  async function completePickup(formData: FormData) {
    'use server'
    const requestId = String(formData.get('requestId') ?? '')
    const binCode = String(formData.get('binCode') ?? '').trim()
    if (!requestId) return

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const isCollector = profileRow?.role === 'collector'
    const isAdmin = profileRow?.role === 'admin'
    if (!isCollector && !isAdmin) return

    const { data: requestRow } = await supabase
      .from('pickup_requests')
      .select('id, user_id, waste_type, status, assigned_collector_id, bin_id')
      .eq('id', requestId)
      .maybeSingle()

    const request = requestRow as PickupRequest | null
    if (!request) return
    if (!isAdmin && request.assigned_collector_id !== user.id) return
    if (request.status === 'completed') return

    if (!isAdmin) {
      const expectedBin = String(request.bin_id ?? '').trim()
      if (!expectedBin || binCode !== expectedBin) {
        redirect('/dashboard?error=bin_code_mismatch')
      }
    }

    const points =
      request.waste_type === 'recyclable'
        ? 15
        : request.waste_type === 'hazardous'
          ? 10
          : 5

    const logInsert = await supabase.from('pickup_logs').insert({
      request_id: request.id,
      collector_id: user.id,
    })

    if (logInsert.error) return

    const rpcResult = await supabase.rpc('increment_eco_points', {
      user_id_input: request.user_id,
      points_input: points,
    })

    if (rpcResult.error) {
      const { data: residentProfileRow } = await supabase
        .from('profiles')
        .select('eco_points')
        .eq('id', request.user_id)
        .maybeSingle()

      const currentPoints = Number(residentProfileRow?.eco_points ?? 0)

      const pointsUpdate = await supabase
        .from('profiles')
        .update({ eco_points: currentPoints + points })
        .eq('id', request.user_id)

      if (pointsUpdate.error) return
    }

    await supabase
      .from('pickup_requests')
      .update({ status: 'completed' })
      .eq('id', request.id)

    revalidatePath('/dashboard')
  }

  async function assignCollector(formData: FormData) {
    'use server'
    const requestId = String(formData.get('requestId') ?? '')
    const collectorId = String(formData.get('collectorId') ?? '')
    if (!requestId || !collectorId) return

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileRow?.role !== 'admin') return

    const { data: requestRow } = await supabase
      .from('pickup_requests')
      .select('id, status')
      .eq('id', requestId)
      .maybeSingle()

    if (!requestRow) return
    if (requestRow.status === 'completed') return

    await supabase
      .from('pickup_requests')
      .update({
        assigned_collector_id: collectorId,
        status: requestRow.status === 'pending' ? 'assigned' : requestRow.status,
      })
      .eq('id', requestId)

    revalidatePath('/dashboard')
  }

  if (role === 'collector') {
    const { data: assignedRequests } = await supabase
      .from('pickup_requests')
      .select('id, user_id, bin_id, address, waste_type, status, assigned_collector_id, created_at')
      .eq('assigned_collector_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    const requests = (assignedRequests ?? []) as PickupRequest[]

    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div className="rounded-2xl border p-6">
            <h1 className="text-2xl font-bold">
              Collector dashboard{profile?.full_name ? ` — ${profile.full_name}` : ''}
            </h1>
            <p className="mt-1 text-sm text-zinc-600">Assigned pickups and actions</p>
          </div>

          <div className="rounded-2xl border p-6">
            <h2 className="text-lg font-semibold">Assigned pickups</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-4">Address / Bin</th>
                    <th className="py-2 pr-4">Waste type</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Requested</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td className="py-4 text-zinc-600" colSpan={5}>
                        No assigned pickups yet.
                      </td>
                    </tr>
                  ) : (
                    requests.map((r) => (
                      <tr key={r.id} className="border-b">
                        <td className="py-3 pr-4">
                          {r.address?.trim() || r.bin_id || r.id.slice(0, 8)}
                        </td>
                        <td className="py-3 pr-4">{titleForWasteType(r.waste_type)}</td>
                        <td className="py-3 pr-4">{titleForStatus(r.status)}</td>
                        <td className="py-3 pr-4">{formatDate(r.created_at)}</td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-2">
                            <form action={verifyPickup}>
                              <input type="hidden" name="requestId" value={r.id} />
                              <button
                                className="rounded-lg border px-3 py-2"
                                type="submit"
                                disabled={r.status === 'verified' || r.status === 'completed'}
                              >
                                Verify pickup
                              </button>
                            </form>
                            <form action={completePickup}>
                              <input type="hidden" name="requestId" value={r.id} />
                              <button
                                className="rounded-lg bg-green-700 px-3 py-2 text-white disabled:bg-zinc-300"
                                type="submit"
                                disabled={r.status === 'completed'}
                              >
                                Complete pickup
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (role === 'admin') {
    const statusParam = searchParams?.status
    const status =
      typeof statusParam === 'string' && statusParam.trim() ? statusParam.trim() : 'all'

    const requestsQuery = supabase
      .from('pickup_requests')
      .select('id, user_id, bin_id, address, waste_type, status, assigned_collector_id, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    const { data: allRequests } =
      status === 'all' ? await requestsQuery : await requestsQuery.eq('status', status)

    const { data: collectors } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'collector')
      .order('full_name', { ascending: true })
      .limit(200)

    const { data: reportsData, error: reportsError } = await supabase
      .from('reports')
      .select('id, user_id, message, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    const requests = (allRequests ?? []) as PickupRequest[]
    const collectorRows =
      (collectors ?? []).filter((c) => c.role === 'collector') as Array<{
        id: string
        full_name: string | null
        role: string | null
      }>

    const reports = (!reportsError ? (reportsData ?? []) : []) as Report[]

    const [{ count: totalCount }, { count: pendingCount }, { count: assignedCount }, { count: verifiedCount }, { count: completedCount }] =
      await Promise.all([
        supabase.from('pickup_requests').select('id', { count: 'exact', head: true }),
        supabase.from('pickup_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('pickup_requests').select('id', { count: 'exact', head: true }).eq('status', 'assigned'),
        supabase.from('pickup_requests').select('id', { count: 'exact', head: true }).eq('status', 'verified'),
        supabase.from('pickup_requests').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      ])

    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <div className="rounded-2xl border p-6">
            <h1 className="text-2xl font-bold">Admin</h1>
            <p className="mt-1 text-sm text-zinc-600">Requests, assignments, reports, and statistics</p>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <div className="rounded-2xl border p-5">
              <div className="text-sm text-zinc-600">Total requests</div>
              <div className="mt-1 text-2xl font-bold">{totalCount ?? 0}</div>
            </div>
            <div className="rounded-2xl border p-5">
              <div className="text-sm text-zinc-600">Pending</div>
              <div className="mt-1 text-2xl font-bold">{pendingCount ?? 0}</div>
            </div>
            <div className="rounded-2xl border p-5">
              <div className="text-sm text-zinc-600">Assigned</div>
              <div className="mt-1 text-2xl font-bold">{assignedCount ?? 0}</div>
            </div>
            <div className="rounded-2xl border p-5">
              <div className="text-sm text-zinc-600">Verified</div>
              <div className="mt-1 text-2xl font-bold">{verifiedCount ?? 0}</div>
            </div>
            <div className="rounded-2xl border p-5">
              <div className="text-sm text-zinc-600">Completed</div>
              <div className="mt-1 text-2xl font-bold">{completedCount ?? 0}</div>
            </div>
          </div>

          <div className="rounded-2xl border p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold">All requests</h2>
              <form method="get" className="flex items-center gap-2">
                <select
                  className="rounded-lg border px-3 py-2"
                  name="status"
                  defaultValue={status}
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="verified">Verified</option>
                  <option value="completed">Completed</option>
                </select>
                <button className="rounded-lg border px-3 py-2" type="submit">
                  Filter
                </button>
              </form>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-4">Request</th>
                    <th className="py-2 pr-4">Address / Bin</th>
                    <th className="py-2 pr-4">Waste type</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Collector</th>
                    <th className="py-2 pr-4">Assign</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td className="py-4 text-zinc-600" colSpan={6}>
                        No requests.
                      </td>
                    </tr>
                  ) : (
                    requests.map((r) => (
                      <tr key={r.id} className="border-b align-top">
                        <td className="py-3 pr-4">{r.id.slice(0, 8)}</td>
                        <td className="py-3 pr-4">{r.address?.trim() || r.bin_id || ''}</td>
                        <td className="py-3 pr-4">{titleForWasteType(r.waste_type)}</td>
                        <td className="py-3 pr-4">{titleForStatus(r.status)}</td>
                        <td className="py-3 pr-4">
                          {r.assigned_collector_id
                            ? collectorRows.find((c) => c.id === r.assigned_collector_id)?.full_name ??
                              r.assigned_collector_id.slice(0, 8)
                            : '—'}
                        </td>
                        <td className="py-3 pr-4">
                          <form action={assignCollector} className="flex items-center gap-2">
                            <input type="hidden" name="requestId" value={r.id} />
                            <select
                              name="collectorId"
                              className="rounded-lg border px-3 py-2"
                              defaultValue={r.assigned_collector_id ?? ''}
                            >
                              <option value="" disabled>
                                Select collector
                              </option>
                              {collectorRows.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.full_name ?? c.id.slice(0, 8)}
                                </option>
                              ))}
                            </select>
                            <button className="rounded-lg border px-3 py-2" type="submit">
                              Assign
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border p-6">
            <h2 className="text-lg font-semibold">Reports from residents</h2>
            <div className="mt-4 space-y-3">
              {reports.length === 0 ? (
                <div className="text-sm text-zinc-600">No reports.</div>
              ) : (
                reports.map((r) => (
                  <div key={r.id} className="rounded-xl border p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm font-medium">{r.user_id.slice(0, 8)}</div>
                      <div className="text-xs text-zinc-600">{formatDate(r.created_at)}</div>
                    </div>
                    <div className="mt-2 text-sm text-zinc-700">{r.message ?? ''}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { count: completedCount } = await supabase
    .from('pickup_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'completed')

  const { data: recentRequests } = await supabase
    .from('pickup_requests')
    .select('id, waste_type, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(8)

  const requests = (recentRequests ?? []) as Array<{
    id: string
    waste_type: string | null
    status: string | null
    created_at?: string | null
  }>

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="rounded-2xl border p-6">
          <h1 className="text-2xl font-bold">
            Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">Your pickups and eco-points</p>
          <div className="mt-4">
            <a
              className="inline-flex items-center rounded-lg bg-green-700 px-4 py-3 text-white"
              href="#request-pickup"
            >
              Request pickup
            </a>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border p-6">
            <div className="text-sm text-zinc-600">Total pickups</div>
            <div className="mt-1 text-3xl font-bold">{completedCount ?? 0}</div>
          </div>
          <div className="rounded-2xl border p-6">
            <div className="text-sm text-zinc-600">Eco-points</div>
            <div className="mt-1 text-3xl font-bold">{profile?.eco_points ?? 0}</div>
          </div>
        </div>

        <div className="rounded-2xl border p-6">
          <h2 className="text-lg font-semibold">Recent requests</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4">Request</th>
                  <th className="py-2 pr-4">Waste type</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td className="py-4 text-zinc-600" colSpan={4}>
                      No pickup requests yet.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="py-3 pr-4">{r.id.slice(0, 8)}</td>
                      <td className="py-3 pr-4">{titleForWasteType(r.waste_type)}</td>
                      <td className="py-3 pr-4">{titleForStatus(r.status)}</td>
                      <td className="py-3 pr-4">{formatDate(r.created_at ?? null)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div id="request-pickup" className="space-y-4">
          <PickupForm userId={user.id} binId={(profile?.bin_id ?? undefined) || undefined} />
          <div className="rounded-2xl border p-6">
            <h3 className="text-base font-semibold">Points rules (MVP)</h3>
            <div className="mt-2 grid gap-2 text-sm text-zinc-700 md:grid-cols-3">
              <div className="rounded-xl border p-4">
                <div className="font-medium">General waste</div>
                <div className="mt-1 text-zinc-600">5 points</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="font-medium">Recyclable waste</div>
                <div className="mt-1 text-zinc-600">15 points</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="font-medium">Hazardous reported</div>
                <div className="mt-1 text-zinc-600">10 points</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
