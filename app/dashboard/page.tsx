import { createClient } from '@/lib/supabase/server'
import PickupForm from '@/app/components/pickup-form'
import AdminUserManager from '@/app/components/admin-user-manager'
import AdminReportsManager from '@/app/components/admin-reports-manager'
import MapView from '@/app/components/map-view'
import BinQR from '@/app/components/bin-qr'
import NotificationCenter from '@/app/components/notification-center'
import StatCard from '@/app/components/stat-card'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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
  notes?: string | null
  waste_type: string | null
  status: string | null
  assigned_collector_id?: string | null
  created_at?: string | null
  latitude?: number | null
  longitude?: number | null
}

type Report = {
  id: string
  user_id: string
  type?: string | null
  description?: string | null
  message?: string | null
  status?: string | null
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}) {
  noStore()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/dashboard')

  const sp = (await Promise.resolve(searchParams)) ?? {}

  const initialProfileFetch = await supabase
    .from('profiles')
    .select('id, full_name, role, eco_points, bin_id')
    .eq('id', user.id)
    .maybeSingle()

  let profileRow = initialProfileFetch.data ?? null
  let profileReadError = initialProfileFetch.error?.message ?? null

  if (!profileRow && !profileReadError) {
    const metadata = user.user_metadata as Record<string, unknown>
    const fullNameFromMetadata =
      (typeof metadata?.full_name === 'string' && metadata.full_name.trim()
        ? metadata.full_name.trim()
        : typeof metadata?.name === 'string' && metadata.name.trim()
          ? metadata.name.trim()
          : null) ?? null
    const metadataRole = typeof metadata?.role === 'string' ? metadata.role.trim() : ''
    const inferredRole = metadataRole === 'collector' ? 'collector' : 'user'

    await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          full_name: fullNameFromMetadata,
          role: inferredRole,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      )

    const refetch = await supabase
      .from('profiles')
      .select('id, full_name, role, eco_points, bin_id')
      .eq('id', user.id)
      .maybeSingle()

    profileRow = refetch.data ?? null
    profileReadError = refetch.error?.message ?? null
  }

  const profile = (profileRow ?? null) as Profile | null
  const role = profile?.role ?? 'user'

  if (role === 'collector') {
    redirect('/collector')
  }

  const devAdminBootstrapEnabled =
    process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_ADMIN_BOOTSTRAP === '1'

  const metadata = user.user_metadata as Record<string, unknown>
  const metadataName =
    (typeof metadata?.full_name === 'string' && metadata.full_name.trim()
      ? metadata.full_name.trim()
      : typeof metadata?.name === 'string' && metadata.name.trim()
        ? metadata.name.trim()
        : null) ?? null

  const displayName = profile?.full_name?.trim() ? profile.full_name : metadataName ?? 'User'
  const roleLabel = role === 'admin' ? 'Admin' : role === 'collector' ? 'Collector' : 'Resident'

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  async function devMakeMeAdmin() {
    'use server'
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_ADMIN_BOOTSTRAP !== '1') {
      redirect('/dashboard')
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login?next=/dashboard')

    const update = await supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id)
    if (update.error) {
      redirect(`/dashboard?toast=${encodeURIComponent(update.error.message.slice(0, 160))}&toast_type=error`)
    }

    revalidatePath('/dashboard')
    redirect('/dashboard?toast=You%20are%20now%20admin.&toast_type=success')
  }

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
      .select('*')
      .eq('id', requestId)
      .maybeSingle()

    if (!requestRow) return
    const request = requestRow as PickupRequest & { bin_code?: string | null }
    if (!isAdmin && request.assigned_collector_id !== user.id) return
    if (request.status === 'completed') return
    if (request.status === 'verified') return
    if (!isAdmin) {
      let expectedBin = String(request.bin_code ?? '').trim()
      if (!expectedBin && request.bin_id && isUuid(String(request.bin_id))) {
        const binLookup = await supabase.from('bins').select('code').eq('id', request.bin_id).maybeSingle()
        expectedBin =
          !binLookup.error && typeof (binLookup.data as { code?: string | null } | null)?.code === 'string'
            ? String((binLookup.data as { code?: string | null }).code).trim()
            : ''
      }
      if (!expectedBin) expectedBin = String(request.bin_id ?? '').trim()
      if (!expectedBin || binCode !== expectedBin) {
        redirect('/dashboard?error=bin_code_mismatch')
      }
    }

    const verifyUpdate = await supabase
      .from('pickup_requests')
      .update({ status: 'verified', verified_at: new Date().toISOString() } as unknown as Record<string, unknown>)
      .eq('id', requestId)

    if (verifyUpdate.error && verifyUpdate.error.message.toLowerCase().includes('column') && verifyUpdate.error.message.toLowerCase().includes('verified_at')) {
      await supabase.from('pickup_requests').update({ status: 'verified' }).eq('id', requestId)
    }

    const verifyLog = await supabase.from('pickup_logs').insert({
      request_id: requestId,
      collector_id: user.id,
      action: 'verified',
    } as unknown as Record<string, unknown>)

    if (
      verifyLog.error &&
      verifyLog.error.message.toLowerCase().includes('column') &&
      verifyLog.error.message.toLowerCase().includes('action')
    ) {
      const fallbackLog = await supabase.from('pickup_logs').insert({
        request_id: requestId,
        collector_id: user.id,
      })
      if (fallbackLog.error) {
        redirect('/dashboard?error=log_failed')
      }
    } else if (verifyLog.error) {
      redirect('/dashboard?error=log_failed')
    }

    revalidatePath('/dashboard')
    redirect('/dashboard?toast=Pickup%20verified.&toast_type=success')
  }

  async function completePickup(formData: FormData) {
    'use server'
    const requestId = String(formData.get('requestId') ?? '')
    const binCode = String(formData.get('binCode') ?? '').trim()
    const collectorNotes = String(formData.get('collectorNotes') ?? '').trim()
    const weightKgRaw = String(formData.get('weightKg') ?? '').trim()
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
      .select('*')
      .eq('id', requestId)
      .maybeSingle()

    const request = requestRow as (PickupRequest & { bin_code?: string | null }) | null
    if (!request) return
    if (!isAdmin && request.assigned_collector_id !== user.id) return
    if (request.status === 'completed') return
    if (!isAdmin && request.status !== 'verified') {
      redirect('/dashboard?error=must_verify_first')
    }

    if (!isAdmin) {
      let expectedBin = String(request.bin_code ?? '').trim()
      if (!expectedBin && request.bin_id && isUuid(String(request.bin_id))) {
        const binLookup = await supabase.from('bins').select('code').eq('id', request.bin_id).maybeSingle()
        expectedBin =
          !binLookup.error && typeof (binLookup.data as { code?: string | null } | null)?.code === 'string'
            ? String((binLookup.data as { code?: string | null }).code).trim()
            : ''
      }
      if (!expectedBin) expectedBin = String(request.bin_id ?? '').trim()
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

    let weightKg: number | null = null
    if (weightKgRaw) {
      const parsed = Number(weightKgRaw)
      if (!Number.isFinite(parsed) || parsed < 0) {
        redirect('/dashboard?error=invalid_weight')
      }
      weightKg = parsed
    }

    const extendedLog = await supabase.from('pickup_logs').insert({
      request_id: request.id,
      collector_id: user.id,
      action: 'completed',
      weight_kg: weightKg,
      notes: collectorNotes || null,
    } as unknown as Record<string, unknown>)

    if (
      extendedLog.error &&
      extendedLog.error.message.toLowerCase().includes('column') &&
      (extendedLog.error.message.toLowerCase().includes('action') ||
        extendedLog.error.message.toLowerCase().includes('weight_kg') ||
        extendedLog.error.message.toLowerCase().includes('notes'))
    ) {
      const fallbackLog = await supabase.from('pickup_logs').insert({
        request_id: request.id,
        collector_id: user.id,
      })
      if (fallbackLog.error) {
        redirect('/dashboard?error=log_failed')
      }
    } else if (extendedLog.error) {
      redirect('/dashboard?error=log_failed')
    }

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

    const completionUpdate = await supabase
      .from('pickup_requests')
      .update({ status: 'completed', completed_at: new Date().toISOString() } as unknown as Record<string, unknown>)
      .eq('id', request.id)

    if (completionUpdate.error && completionUpdate.error.message.toLowerCase().includes('column') && completionUpdate.error.message.toLowerCase().includes('completed_at')) {
      await supabase.from('pickup_requests').update({ status: 'completed' }).eq('id', request.id)
    }

    revalidatePath('/dashboard')
    redirect('/dashboard?toast=Pickup%20completed.&toast_type=success')
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

  async function createBin(formData: FormData) {
    'use server'
    const code = String(formData.get('code') ?? '').trim()
    const address = String(formData.get('address') ?? '').trim()
    if (!code) return
    if (!address) {
      redirect('/dashboard?bins_error=missing_address')
    }

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

    if (profileRow?.role !== 'admin') {
      redirect('/dashboard?bins_error=not_admin')
    }

    const primaryInsert = await supabase.from('bins').insert({ code, address } as unknown as Record<string, unknown>)
    const insert =
      primaryInsert.error &&
      primaryInsert.error.message.toLowerCase().includes('column') &&
      primaryInsert.error.message.toLowerCase().includes('address')
        ? await supabase.from('bins').insert({ code } as unknown as Record<string, unknown>)
        : primaryInsert

    if (insert.error) {
      const msg = insert.error.message.toLowerCase()
      if (msg.includes('duplicate') || msg.includes('unique')) {
        redirect('/dashboard?bins_error=duplicate')
      }
      if (msg.includes('row-level security') || msg.includes('rls') || msg.includes('security policy') || msg.includes('permission denied')) {
        redirect('/dashboard?bins_error=rls')
      }
      redirect(`/dashboard?bins_error=unknown&bins_error_detail=${encodeURIComponent(insert.error.message.slice(0, 160))}`)
    }

    revalidatePath('/dashboard')
    redirect('/dashboard?bins_created=1')
  }

  async function deleteBin(formData: FormData) {
    'use server'
    const binId = String(formData.get('binId') ?? '').trim()
    if (!binId) return

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

    if (profileRow?.role !== 'admin') {
      redirect('/dashboard?bins_error=not_admin')
    }

    const del = await supabase.from('bins').delete().eq('id', binId)
    if (del.error) {
      const msg = del.error.message.toLowerCase()
      if (msg.includes('row-level security') || msg.includes('rls') || msg.includes('security policy') || msg.includes('permission denied')) {
        redirect('/dashboard?bins_error=rls')
      }
      redirect(`/dashboard?bins_error=unknown&bins_error_detail=${encodeURIComponent(del.error.message.slice(0, 160))}`)
    }

    revalidatePath('/dashboard')
    redirect('/dashboard?bins_deleted=1')
  }

  if (role === 'collector') {
    const errorParam = sp.error
    const error = typeof errorParam === 'string' ? errorParam : ''
    const { data: assignedRequests } = await supabase
      .from('pickup_requests')
      .select('id, user_id, bin_id, address, notes, waste_type, status, assigned_collector_id, created_at, latitude, longitude')
      .eq('assigned_collector_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    const requests = (assignedRequests ?? []) as PickupRequest[]
    const rawAssignedBinId = String(profile?.bin_id ?? '').trim()
    let assignedBinLabel = rawAssignedBinId ? rawAssignedBinId : 'Not set'
    if (rawAssignedBinId && isUuid(rawAssignedBinId)) {
      const assignedBinLookup = await supabase.from('bins').select('code').eq('id', rawAssignedBinId).maybeSingle()
      const code =
        !assignedBinLookup.error && typeof (assignedBinLookup.data as { code?: string | null } | null)?.code === 'string'
          ? String((assignedBinLookup.data as { code?: string | null }).code).trim()
          : ''
      assignedBinLabel = code ? code : `Unregistered bin (${rawAssignedBinId.slice(0, 8)})`
    }
    const collectorBinIds = [...new Set(requests.map((r) => r.bin_id).filter((v): v is string => !!v))]
    const { data: collectorBins, error: collectorBinsError } =
      collectorBinIds.length > 0
        ? await supabase.from('bins').select('id, code').in('id', collectorBinIds)
        : await Promise.resolve({ data: [] as Array<{ id: string; code: string | null }>, error: null as unknown })

    const collectorBinCodeById = new Map<string, string>(
      !collectorBinsError
        ? (collectorBins ?? []).map((b) => [b.id, (b.code ?? '').trim() ? (b.code as string).trim() : ''])
        : []
    )
    const pickupMarkers = requests
      .map((r) => {
        const lat = typeof r.latitude === 'number' ? r.latitude : null
        const lng = typeof r.longitude === 'number' ? r.longitude : null
        if (lat === null || lng === null) return null
        const addressLabel =
          r.address?.trim() ||
          (r.bin_id
            ? collectorBinCodeById.get(r.bin_id)?.trim()
              ? collectorBinCodeById.get(r.bin_id)
              : 'Unregistered bin'
            : '') ||
          r.id.slice(0, 8)
        const label = `${addressLabel} • ${titleForWasteType(r.waste_type)} • ${titleForStatus(r.status)}`
        return { id: r.id, lat, lng, label }
      })
      .filter((v): v is { id: string; lat: number; lng: number; label: string } => !!v)

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
            <h1 className="text-2xl font-bold tracking-tight">Collector dashboard</h1>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Welcome, {displayName}</div>
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
              Verify the bin code before verifying or completing a pickup.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <div className="text-zinc-600 dark:text-zinc-300">Assigned bin</div>
              <div className="rounded-full border border-black/[.08] bg-white px-3 py-1 text-xs text-zinc-700 dark:border-white/[.145] dark:bg-black dark:text-zinc-200">
                {assignedBinLabel}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Map</h2>
              <div className="text-sm text-zinc-600 dark:text-zinc-300">Assigned pickup locations</div>
            </div>
            <div className="mt-4">
              {pickupMarkers.length === 0 ? (
                <div className="text-sm text-zinc-600 dark:text-zinc-300">
                  No pickup locations yet. Add a location when submitting a pickup request.
                </div>
              ) : (
                <MapView markers={pickupMarkers} />
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold">Assigned pickups</h2>
              {error === 'bin_code_mismatch' && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  Bin code mismatch. Please scan or enter the correct bin code.
                </div>
              )}
              {error === 'must_verify_first' && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  Verify the pickup first, then complete it.
                </div>
              )}
              {error === 'invalid_weight' && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  Invalid weight. Enter a valid number.
                </div>
              )}
              {error === 'log_failed' && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  Could not create a pickup log entry. Run supabase_pickup_logs_schema.sql, then try again.
                </div>
              )}
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-black/[.08] text-zinc-600 dark:border-white/[.145] dark:text-zinc-300">
                    <th className="py-3 pr-4 font-medium">Address / Bin</th>
                    <th className="py-3 pr-4 font-medium">Waste type</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Requested</th>
                    <th className="py-3 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td className="py-6 text-zinc-600 dark:text-zinc-300" colSpan={5}>
                        No assigned pickups yet. If there are pending requests, an admin must assign them to you.
                      </td>
                    </tr>
                  ) : (
                    requests.map((r) => (
                      <tr key={r.id} className="border-b border-black/[.08] dark:border-white/[.145]">
                        <td className="py-4 pr-4">
                          <div className="font-medium">
                            {r.address?.trim() ||
                              (r.bin_id
                                ? collectorBinCodeById.get(r.bin_id)?.trim()
                                  ? collectorBinCodeById.get(r.bin_id)
                                  : 'Unregistered bin'
                                : '') ||
                              r.id.slice(0, 8)}
                          </div>
                          {r.bin_id && (
                            <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                              {collectorBinCodeById.get(r.bin_id)?.trim() ? collectorBinCodeById.get(r.bin_id) : 'Unregistered bin'}
                            </div>
                          )}
                          {r.notes?.trim() && (
                            <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">{r.notes.trim()}</div>
                          )}
                        </td>
                        <td className="py-4 pr-4">{titleForWasteType(r.waste_type)}</td>
                        <td className="py-4 pr-4">{titleForStatus(r.status)}</td>
                        <td className="py-4 pr-4">{formatDate(r.created_at)}</td>
                        <td className="py-4 pr-4">
                          <div className="flex flex-col gap-2">
                            <form action={verifyPickup} className="flex flex-wrap items-center gap-2">
                              <input type="hidden" name="requestId" value={r.id} />
                              <input
                                className="w-44 rounded-lg border border-black/[.08] bg-white px-3 py-2 outline-none focus:border-green-700 dark:border-white/[.145] dark:bg-black"
                                name="binCode"
                                placeholder="Enter bin code or UUID"
                              />
                              <button
                                className="rounded-lg border border-black/[.08] px-3 py-2 transition-colors hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.145] dark:hover:bg-white/[.08]"
                                type="submit"
                                disabled={r.status === 'verified' || r.status === 'completed'}
                              >
                                Verify pickup
                              </button>
                            </form>
                            <form action={completePickup} className="flex flex-wrap items-center gap-2">
                              <input type="hidden" name="requestId" value={r.id} />
                              <input
                                className="w-44 rounded-lg border border-black/[.08] bg-white px-3 py-2 outline-none focus:border-green-700 dark:border-white/[.145] dark:bg-black"
                                name="binCode"
                                placeholder="Enter bin code or UUID"
                              />
                              <input
                                className="w-32 rounded-lg border border-black/[.08] bg-white px-3 py-2 outline-none focus:border-green-700 dark:border-white/[.145] dark:bg-black"
                                name="weightKg"
                                placeholder="Weight (kg)"
                                type="number"
                                min="0"
                                step="0.01"
                              />
                              <input
                                className="min-w-48 flex-1 rounded-lg border border-black/[.08] bg-white px-3 py-2 outline-none focus:border-green-700 dark:border-white/[.145] dark:bg-black"
                                name="collectorNotes"
                                placeholder="Collector notes (optional)"
                              />
                              <button
                                className="rounded-lg bg-green-700 px-3 py-2 text-white disabled:bg-zinc-300"
                                type="submit"
                                disabled={r.status !== 'verified'}
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
        </main>
      </div>
    )
  }

  if (role === 'admin') {
    const statusParam = sp.status
    const status =
      typeof statusParam === 'string' && statusParam.trim() ? statusParam.trim() : 'all'

    const binsCreatedParam = sp.bins_created
    const binsCreated = typeof binsCreatedParam === 'string' ? binsCreatedParam === '1' : false
    const binsDeletedParam = sp.bins_deleted
    const binsDeleted = typeof binsDeletedParam === 'string' ? binsDeletedParam === '1' : false
    const binsErrorParam = sp.bins_error
    const binsError = typeof binsErrorParam === 'string' ? binsErrorParam : ''
    const binsErrorDetailParam = sp.bins_error_detail
    const binsErrorDetail = typeof binsErrorDetailParam === 'string' ? binsErrorDetailParam : ''

    const requestsQuery = supabase
      .from('pickup_requests')
      .select('id, user_id, bin_id, address, waste_type, status, assigned_collector_id, created_at, latitude, longitude')
      .order('created_at', { ascending: false })
      .limit(100)

    const [
      { data: allRequests },
      { data: collectors },
      reportsWithStatus,
    ] = await Promise.all([
      status === 'all' ? requestsQuery : requestsQuery.eq('status', status),
      supabase
        .from('profiles')
        .select('id, full_name, role, current_lat, current_lng, location_updated_at')
        .eq('role', 'collector')
        .order('full_name', { ascending: true })
        .limit(200),
      supabase
        .from('reports')
        .select('id, user_id, type, description, message, created_at, status')
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    const reportsErrorMessage = reportsWithStatus.error?.message.toLowerCase() ?? ''
    const reportsFallback =
      reportsWithStatus.error &&
      reportsErrorMessage.includes('column') &&
      (reportsErrorMessage.includes('status') ||
        reportsErrorMessage.includes('type') ||
        reportsErrorMessage.includes('description') ||
        reportsErrorMessage.includes('message'))
        ? reportsErrorMessage.includes('status')
          ? await supabase
              .from('reports')
              .select('id, user_id, message, created_at')
              .order('created_at', { ascending: false })
              .limit(50)
          : reportsErrorMessage.includes('message')
            ? await supabase
                .from('reports')
                .select('id, user_id, type, description, created_at, status')
                .order('created_at', { ascending: false })
                .limit(50)
            : await supabase
                .from('reports')
                .select('id, user_id, message, created_at, status')
                .order('created_at', { ascending: false })
                .limit(50)
        : null

    const reportsStatusMissing = reportsErrorMessage.includes('column') && reportsErrorMessage.includes('status')
    const reportsData = (reportsFallback?.data ?? reportsWithStatus.data) as unknown
    const reportsError = reportsFallback?.error ?? reportsWithStatus.error

    const requests = (allRequests ?? []) as PickupRequest[]
    const collectorRows =
      (collectors ?? []).filter((c) => c.role === 'collector') as Array<{
        id: string
        full_name: string | null
        role: string | null
        current_lat?: number | null
        current_lng?: number | null
        location_updated_at?: string | null
      }>

    const reports = (!reportsError ? (reportsData ?? []) : []) as Report[]
    const adminBinIds = [...new Set(requests.map((r) => r.bin_id).filter((v): v is string => !!v))]
    const { data: adminBins, error: adminBinsError } =
      adminBinIds.length > 0
        ? await supabase.from('bins').select('id, code').in('id', adminBinIds)
        : await Promise.resolve({ data: [] as Array<{ id: string; code: string | null }>, error: null as unknown })

    const adminBinCodeById = new Map<string, string>(
      !adminBinsError ? (adminBins ?? []).map((b) => [b.id, (b.code ?? '').trim() ? (b.code as string).trim() : '']) : []
    )
    const requestMarkers = requests
      .map((r) => {
        const lat = typeof r.latitude === 'number' ? r.latitude : null
        const lng = typeof r.longitude === 'number' ? r.longitude : null
        if (lat === null || lng === null) return null
        const addressLabel =
          r.address?.trim() ||
          (r.bin_id
            ? adminBinCodeById.get(r.bin_id)?.trim()
              ? adminBinCodeById.get(r.bin_id)
              : 'Unregistered bin'
            : '') ||
          r.id.slice(0, 8)
        const label = `${addressLabel} • ${titleForWasteType(r.waste_type)} • ${titleForStatus(r.status)}`
        return { id: r.id, lat, lng, label }
      })
      .filter((v): v is { id: string; lat: number; lng: number; label: string } => !!v)

    const collectorMarkers = collectorRows
      .filter(c => typeof c.current_lat === 'number' && typeof c.current_lng === 'number')
      .map(c => ({
        id: `collector-${c.id}`,
        collectorId: c.id,
        lat: c.current_lat as number,
        lng: c.current_lng as number,
        label: `Collector: ${c.full_name || 'Unknown'}`
      }))
    const reporterIds = [...new Set(reports.map((r) => r.user_id))]
    const { data: reporterProfiles } =
      reporterIds.length > 0
        ? await supabase.from('profiles').select('id, full_name').in('id', reporterIds)
        : await Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null }> })

    const reporterNameById = new Map(
      (reporterProfiles ?? []).map((p) => [p.id, p.full_name?.trim() ? p.full_name : 'User'])
    )
    const reporterNameRecord = Object.fromEntries(reporterNameById.entries())

    const [
      { count: totalCount },
      { count: pendingCount },
      { count: assignedCount },
      { count: verifiedCount },
      { count: completedCount },
      { count: totalUsersCount },
      { count: totalReportsCount },
    ] = await Promise.all([
      supabase.from('pickup_requests').select('id', { count: 'exact', head: true }),
      supabase.from('pickup_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('pickup_requests').select('id', { count: 'exact', head: true }).eq('status', 'assigned'),
      supabase.from('pickup_requests').select('id', { count: 'exact', head: true }).eq('status', 'verified'),
      supabase.from('pickup_requests').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('reports').select('id', { count: 'exact', head: true }),
    ])

    const unresolvedReports = await supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'under_review'])

    const unresolvedReportsCount =
      unresolvedReports.error &&
      unresolvedReports.error.message.toLowerCase().includes('column') &&
      unresolvedReports.error.message.toLowerCase().includes('status')
        ? null
        : unresolvedReports.count ?? 0

    const { data: binsData, error: binsReadError } = await supabase
      .from('bins')
      .select('id, code, address')
      .order('code', { ascending: true })
      .limit(200)

    const bins = (!binsReadError ? (binsData ?? []) : []) as Array<{ id: string; code: string | null; address?: string | null }>

    const { data: userProfilesData, error: userProfilesError } = await supabase
      .from('profiles')
      .select('id, full_name, role, bin_id')
      .order('full_name', { ascending: true })
      .limit(200)

    const userProfiles = (!userProfilesError ? (userProfilesData ?? []) : []) as Array<{
      id: string
      full_name: string | null
      role: string | null
      bin_id: string | null
    }>

    const { data: openRequestsData } = await supabase
      .from('pickup_requests')
      .select('bin_id, status')
      .in('status', ['pending', 'assigned', 'verified'])
      .limit(2000)

    const openCountByBinId = new Map<string, number>()
    ;(openRequestsData ?? []).forEach((row) => {
      const binId = String((row as { bin_id?: string | null } | null)?.bin_id ?? '').trim()
      if (!binId) return
      openCountByBinId.set(binId, (openCountByBinId.get(binId) ?? 0) + 1)
    })

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
              {role === 'admin' && (
                <Link
                  href="/admin"
                  className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100 dark:border-purple-900/30 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/40"
                >
                  Admin Panel
                </Link>
              )}
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
            <h1 className="text-2xl font-bold tracking-tight">Admin dashboard</h1>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Welcome, {displayName}</div>
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
              Filter requests, assign collectors, and review resident reports.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-7">
            <div className="rounded-3xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-black">
              <div className="text-sm text-zinc-600 dark:text-zinc-300">Total requests</div>
              <div className="mt-1 text-2xl font-bold">{totalCount ?? 0}</div>
            </div>
            <div className="rounded-3xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-black">
              <div className="text-sm text-zinc-600 dark:text-zinc-300">Pending</div>
              <div className="mt-1 text-2xl font-bold">{pendingCount ?? 0}</div>
            </div>
            <div className="rounded-3xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-black">
              <div className="text-sm text-zinc-600 dark:text-zinc-300">Assigned</div>
              <div className="mt-1 text-2xl font-bold">{assignedCount ?? 0}</div>
            </div>
            <div className="rounded-3xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-black">
              <div className="text-sm text-zinc-600 dark:text-zinc-300">Verified</div>
              <div className="mt-1 text-2xl font-bold">{verifiedCount ?? 0}</div>
            </div>
            <div className="rounded-3xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-black">
              <div className="text-sm text-zinc-600 dark:text-zinc-300">Completed</div>
              <div className="mt-1 text-2xl font-bold">{completedCount ?? 0}</div>
            </div>
            <div className="rounded-3xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-black">
              <div className="text-sm text-zinc-600 dark:text-zinc-300">Users</div>
              <div className="mt-1 text-2xl font-bold">{totalUsersCount ?? 0}</div>
            </div>
            <div className="rounded-3xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-black">
              <div className="text-sm text-zinc-600 dark:text-zinc-300">Reports</div>
              <div className="mt-1 text-2xl font-bold">{totalReportsCount ?? 0}</div>
              {unresolvedReportsCount !== null && (
                <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">{unresolvedReportsCount} unresolved</div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Requests & Live Collectors map</h2>
              <div className="text-sm text-zinc-600 dark:text-zinc-300">Tracking active requests and online collectors</div>
            </div>
            <div className="mt-4">
              {requestMarkers.length === 0 && collectorMarkers.length === 0 ? (
                <div className="text-sm text-zinc-600 dark:text-zinc-300">
                  No request locations or active collectors yet.
                </div>
              ) : (
                <MapView markers={requestMarkers} collectorMarkers={collectorMarkers} />
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Bins</h2>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Create and manage bin codes.</div>
              </div>
              <form action={createBin} className="flex flex-col gap-2 md:flex-row md:items-center">
                <input
                  className="w-full rounded-lg border border-black/[.08] bg-white px-3 py-2 outline-none focus:border-green-700 dark:border-white/[.145] dark:bg-black md:w-56"
                  name="code"
                  placeholder="BIN-0001"
                />
                <input
                  className="w-full rounded-lg border border-black/[.08] bg-white px-3 py-2 outline-none focus:border-green-700 dark:border-white/[.145] dark:bg-black md:w-64"
                  name="address"
                  placeholder="Bin address / location"
                />
                <button className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white" type="submit">
                  Add bin
                </button>
              </form>
            </div>
            {(binsCreated || binsDeleted || binsError) && (
              <div className="mt-4 space-y-2">
                {binsCreated && (
                  <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    Bin added.
                  </div>
                )}
                {binsDeleted && (
                  <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    Bin deleted.
                  </div>
                )}
                {binsError === 'duplicate' && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    That bin code already exists.
                  </div>
                )}
                {binsError === 'not_admin' && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Your account is not an admin. Promote your user (see supabase_promote_admin.sql), then try again.
                  </div>
                )}
                {binsError === 'missing_address' && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Address is required for this bins table schema.
                  </div>
                )}
                {binsError === 'rls' && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Bin write blocked by RLS. Run supabase_admin_full_access.sql (or supabase_bins_admin.sql), then try
                    again. If it still fails, make sure your profile role is admin (see supabase_promote_admin.sql).
                  </div>
                )}
                {binsError === 'unknown' && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Bin update failed{binsErrorDetail ? `: ${binsErrorDetail}` : '.'}
                  </div>
                )}
              </div>
            )}
            {binsReadError ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Could not read bins: {binsReadError.message}
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-black/[.08] text-zinc-600 dark:border-white/[.145] dark:text-zinc-300">
                      <th className="py-3 pr-4 font-medium">Code</th>
                      <th className="py-3 pr-4 font-medium">Address</th>
                      <th className="py-3 pr-4 font-medium">Status</th>
                      <th className="py-3 pr-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bins.length === 0 ? (
                      <tr>
                        <td className="py-6 text-zinc-600 dark:text-zinc-300" colSpan={4}>
                          No bins yet.
                        </td>
                      </tr>
                    ) : (
                      bins.map((b) => (
                        <tr key={b.id} className="border-b border-black/[.08] dark:border-white/[.145]">
                          <td className="py-4 pr-4">{b.code?.trim() ? b.code : '—'}</td>
                          <td className="py-4 pr-4">{b.address?.trim() ? b.address : '—'}</td>
                          <td className="py-4 pr-4">
                            {(openCountByBinId.get(b.id) ?? 0) > 0 ? `In process (${openCountByBinId.get(b.id)})` : 'Available'}
                          </td>
                          <td className="py-4 pr-4">
                            <form action={deleteBin}>
                              <input type="hidden" name="binId" value={b.id} />
                              <button
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                                type="submit"
                              >
                                Delete
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <AdminUserManager
            currentUserId={user.id}
            initialUsers={userProfiles}
            initialBins={bins as unknown as Array<{ id: string; code: string | null; address?: string | null }>}
          />

          <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold">All requests</h2>
              <form method="get" className="flex items-center gap-2">
                <select
                title=''
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

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-black/[.08] text-zinc-600 dark:border-white/[.145] dark:text-zinc-300">
                    <th className="py-3 pr-4 font-medium">Request</th>
                    <th className="py-3 pr-4 font-medium">Address / Bin</th>
                    <th className="py-3 pr-4 font-medium">Waste type</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Collector</th>
                    <th className="py-3 pr-4 font-medium">Assign</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td className="py-6 text-zinc-600 dark:text-zinc-300" colSpan={6}>
                        No requests.
                      </td>
                    </tr>
                  ) : (
                    requests.map((r) => (
                      <tr key={r.id} className="border-b border-black/[.08] align-top dark:border-white/[.145]">
                        <td className="py-4 pr-4">{r.id.slice(0, 8)}</td>
                        <td className="py-4 pr-4">
                          {r.address?.trim() ||
                            (r.bin_id
                              ? adminBinCodeById.get(r.bin_id)?.trim()
                                ? adminBinCodeById.get(r.bin_id)
                                : 'Unregistered bin'
                              : '') ||
                            ''}
                        </td>
                        <td className="py-4 pr-4">{titleForWasteType(r.waste_type)}</td>
                        <td className="py-4 pr-4">{titleForStatus(r.status)}</td>
                        <td className="py-4 pr-4">
                          {r.assigned_collector_id
                            ? collectorRows.find((c) => c.id === r.assigned_collector_id)?.full_name ??
                              r.assigned_collector_id.slice(0, 8)
                            : '—'}
                        </td>
                        <td className="py-4 pr-4">
                          <form action={assignCollector} className="flex items-center gap-2">
                            <input type="hidden" name="requestId" value={r.id} />
                            <select
                              name="collectorId"
                              className="rounded-lg border border-black/[.08] bg-white px-3 py-2 dark:border-white/[.145] dark:bg-black"
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
                            <button
                              className="rounded-lg border border-black/[.08] px-3 py-2 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                              type="submit"
                            >
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

          <AdminReportsManager
            initialReports={
              reports as unknown as Array<{
                id: string
                user_id: string
                message: string | null
                status?: string | null
                created_at?: string | null
              }>
            }
            initialReporterNames={reporterNameRecord}
            initialStatusColumnMissing={reportsStatusMissing}
          />
        </main>
      </div>
    )
  }

  const { count: completedCount } = await supabase
    .from('pickup_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'completed')

  const [
    { data: recentRequests },
    { data: activeCollectorsData }
  ] = await Promise.all([
    supabase
      .from('pickup_requests')
      .select('id, waste_type, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('profiles')
      .select('id, full_name, current_lat, current_lng, role')
      .eq('role', 'collector')
      .not('current_lat', 'is', null)
      .not('current_lng', 'is', null)
  ])

  const requests = (recentRequests ?? []) as Array<{
    id: string
    waste_type: string | null
    status: string | null
    created_at?: string | null
  }>

  const rawBinId = String(profile?.bin_id ?? '').trim()
  let binCode = rawBinId
  if (rawBinId && isUuid(rawBinId)) {
    const binLookup = await supabase.from('bins').select('code').eq('id', rawBinId).maybeSingle()
    const code =
      !binLookup.error && typeof (binLookup.data as { code?: string | null } | null)?.code === 'string'
        ? String((binLookup.data as { code?: string | null }).code).trim()
        : ''
    if (code) binCode = code
  }
  // const binQrSvg = binCode ? await QRCode.toString(binCode, { type: 'svg', margin: 1 }) : ''

  const activeCollectors = (activeCollectorsData ?? []).map(c => ({
    id: `collector-${c.id}`,
    collectorId: c.id,
    lat: c.current_lat as number,
    lng: c.current_lng as number,
    label: `Collector: ${c.full_name || 'Unknown'}`
  }))

  // Force include the assigned collector if they have coordinates, even if not picked up by the general query
  // (though the general query should catch them, this ensures they are definitely passed to the map)
  let mapCollectorMarkers = [...activeCollectors]

  // Find assigned collector for any active request
  const activeRequest = requests.find(r => r.status === 'assigned' || r.status === 'verified')
  let assignedCollector = null
  if (activeRequest) {
    // We need to fetch the assigned collector ID from the request details first
    const { data: requestDetails } = await supabase
      .from('pickup_requests')
      .select('assigned_collector_id')
      .eq('id', activeRequest.id)
      .maybeSingle()
      
    if (requestDetails?.assigned_collector_id) {
      const { data: collectorProfile } = await supabase
        .from('profiles')
        .select('id, full_name, current_lat, current_lng')
        .eq('id', requestDetails.assigned_collector_id)
        .maybeSingle()
        
      if (collectorProfile) {
        assignedCollector = {
          id: collectorProfile.id,
          name: collectorProfile.full_name || 'Assigned Collector',
          lat: collectorProfile.current_lat,
          lng: collectorProfile.current_lng
        }

        // Ensure this specific assigned collector is in the map markers list
        if (assignedCollector.lat && assignedCollector.lng) {
          const alreadyExists = mapCollectorMarkers.some(m => m.collectorId === collectorProfile.id)
          if (!alreadyExists) {
            mapCollectorMarkers.push({
              id: `collector-${collectorProfile.id}`,
              collectorId: collectorProfile.id,
              lat: assignedCollector.lat,
              lng: assignedCollector.lng,
              label: `Collector: ${assignedCollector.name}`
            })
          }
        }
      }
    }
  }

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
              <NotificationCenter userId={user.id} />
              {role === 'admin' && (
                <Link
                  href="/admin"
                  className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100 dark:border-purple-900/30 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/40"
                >
                  Admin Panel
                </Link>
              )}
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
        {devAdminBootstrapEnabled && role !== 'admin' && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>Dev admin bootstrap is enabled for this environment.</div>
              <form action={devMakeMeAdmin}>
                <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm text-white" type="submit">
                  Make me admin
                </button>
              </form>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="flex-1 rounded-3xl border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-black">
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {displayName}</h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-300">
              Track your pickups, request service, and earn eco-points.
            </p>
          </div>
          
          <div className="flex flex-col gap-3 md:w-72 md:justify-center">
            <Link className="flex items-center justify-center gap-2 rounded-2xl bg-green-700 px-4 py-4 text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]" href="/dashboard?section=request-pickup">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              Request a pickup
            </Link>
            <Link className="flex items-center justify-center gap-2 rounded-2xl border border-black/[.08] bg-white px-4 py-4 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] dark:border-white/[.145] dark:bg-black" href="/report">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Report an issue
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <StatCard title="Total pickups" value={completedCount ?? 0} />
          <StatCard title="Eco-points" value={profile?.eco_points ?? 0} colorClass="text-green-600 dark:text-green-400" />
        </div>

        <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Live tracking</h2>
            <div className="text-sm text-zinc-600 dark:text-zinc-300">See collectors actively working in the area</div>
          </div>
          {assignedCollector && (
            <div className="mt-3 mb-3 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-3 text-green-800 dark:border-green-900/30 dark:bg-green-900/20 dark:text-green-300">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-800">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-truck"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
              </div>
              <div>
                <div className="font-semibold">Collector Assigned: {assignedCollector.name}</div>
                <div className="text-xs opacity-80">
                  {assignedCollector.lat && assignedCollector.lng ? 'Live location available on map' : 'Waiting for location signal...'}
                </div>
              </div>
            </div>
          )}
          <div className="mt-4">
            <MapView markers={[]} collectorMarkers={mapCollectorMarkers} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-black/[.08] bg-white p-6 md:col-span-2 dark:border-white/[.145] dark:bg-black">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent requests</h2>
              <div className="flex items-center gap-4">
                <Link
                  className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                  href="/requests"
                >
                  View all
                </Link>
                <Link
                  className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                  href="/dashboard?section=request-pickup"
                >
                  New request
                </Link>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-black/[.08] text-zinc-600 dark:border-white/[.145] dark:text-zinc-300">
                    <th className="py-3 pr-4 font-medium">Request</th>
                    <th className="py-3 pr-4 font-medium">Waste type</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td className="py-6 text-zinc-600 dark:text-zinc-300" colSpan={4}>
                        No pickup requests yet.
                      </td>
                    </tr>
                  ) : (
                    requests.map((r) => (
                      <tr key={r.id} className="border-b border-black/[.08] dark:border-white/[.145]">
                        <td className="py-4 pr-4">{r.id.slice(0, 8)}</td>
                        <td className="py-4 pr-4">{titleForWasteType(r.waste_type)}</td>
                        <td className="py-4 pr-4">{titleForStatus(r.status)}</td>
                        <td className="py-4 pr-4">{formatDate(r.created_at ?? null)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div
            id="bin-info"
            className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black"
          >
            <h2 className="text-lg font-semibold">Your bin code</h2>
            <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">Bin code</div>
            <div className="mt-1 text-xl font-semibold">{binCode || 'Not set'}</div>
            <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">Bin status</div>
            <div className="mt-1 text-sm">
              {requests.some((r) => (r.status ?? '').trim() && r.status !== 'completed')
                ? `In process (${titleForStatus(requests.find((r) => (r.status ?? '').trim() && r.status !== 'completed')?.status ?? 'pending')})`
                : 'Available'}
            </div>
            <div className="mt-4">
              {binCode ? (
                <BinQR code={binCode} size={150} />
              ) : (
                <div className="text-sm text-zinc-600 dark:text-zinc-300">
                  No bin is assigned to your profile. You can still request pickup by entering a bin code or an address.
                </div>
              )}
            </div>
          </div>
        </div>

        <div id="request-pickup" className="scroll-mt-28 space-y-4">
          <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Request pickup</h2>
              <div className="text-sm text-zinc-600 dark:text-zinc-300">Bin code or address required</div>
            </div>
            <div className="mt-4">
              <PickupForm userId={user.id} binId={(profile?.bin_id ?? undefined) || undefined} />
            </div>
          </div>

          <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <h3 className="text-base font-semibold">Points rules (MVP)</h3>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-2xl border border-black/[.08] bg-zinc-50 p-4 dark:border-white/[.145] dark:bg-zinc-900/40">
                <div className="font-medium">General waste</div>
                <div className="mt-1 text-zinc-600 dark:text-zinc-300">5 points</div>
              </div>
              <div className="rounded-2xl border border-black/[.08] bg-zinc-50 p-4 dark:border-white/[.145] dark:bg-zinc-900/40">
                <div className="font-medium">Recyclable waste</div>
                <div className="mt-1 text-zinc-600 dark:text-zinc-300">15 points</div>
              </div>
              <div className="rounded-2xl border border-black/[.08] bg-zinc-50 p-4 dark:border-white/[.145] dark:bg-zinc-900/40">
                <div className="font-medium">Hazardous reported</div>
                <div className="mt-1 text-zinc-600 dark:text-zinc-300">10 points</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
