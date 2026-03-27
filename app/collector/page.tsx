import { createClient } from '@/lib/supabase/server'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type PickupRequestRow = {
  id: string
  address?: string | null
  waste_type: string | null
  status: string | null
  created_at?: string | null
  assigned_collector_id?: string | null
}

function titleForWasteType(wasteType: string | null | undefined) {
  if (wasteType === 'recyclable') return 'Recyclable Waste'
  if (wasteType === 'hazardous') return 'Hazardous Waste'
  if (wasteType === 'general') return 'General Waste'
  return wasteType ?? 'Unknown'
}

function titleForStatus(status: string | null | undefined) {
  if (!status) return 'unknown'
  if (status === 'verified') return 'in progress'
  return status.replaceAll('_', ' ')
}

function formatDate(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

import CollectorActions from '@/app/components/collector-actions'
import CollectorLiveTracker from '@/app/components/collector-live-tracker'
import MapView, { MarkerData, CollectorMarkerData } from '@/app/components/map-view'
import { startPickup, completePickup, signOut } from './actions'

export default async function CollectorPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}) {
  noStore()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/collector')

  const sp = (await Promise.resolve(searchParams)) ?? {}
  const toastParam = sp.toast
  const toast = typeof toastParam === 'string' ? toastParam : ''
  const toastTypeParam = sp.toast_type
  const toastType = typeof toastTypeParam === 'string' ? toastTypeParam : ''
  const errorParam = sp.error
  const error = typeof errorParam === 'string' ? errorParam : ''

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('role, full_name, current_lat, current_lng')
    .eq('id', user.id)
    .maybeSingle()

  const role = profileRow?.role ?? 'user'
  if (role !== 'collector' && role !== 'admin') redirect('/dashboard')

  const { data: assignedRequests } = await supabase
    .from('pickup_requests')
    .select('id, address, waste_type, status, created_at, assigned_collector_id, latitude, longitude, bins(code)')
    .eq('assigned_collector_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const rawRequests = (assignedRequests ?? []) as unknown as (PickupRequestRow & {
    bins: { code: string } | { code: string }[] | null
    latitude?: number | null
    longitude?: number | null
  })[]

  const requests = rawRequests.map((r) => ({
    ...r,
    bins: Array.isArray(r.bins) ? r.bins[0] : r.bins,
  }))

  const hasActivePickup = requests.some(r => r.status === 'verified')
  const displayName = profileRow?.full_name?.trim() ? profileRow.full_name : 'Collector'

  // Prepare map data for collector view
  const requestMarkers = requests
    .filter(r => r.latitude && r.longitude && (r.status === 'assigned' || r.status === 'verified'))
    .map(r => ({
      id: r.id,
      lat: r.latitude as number,
      lng: r.longitude as number,
      label: `${r.address || 'Pickup Request'} • ${titleForWasteType(r.waste_type)}`
    }))

  const collectorMarkers = profileRow?.current_lat && profileRow?.current_lng 
    ? [{
        id: `me-${user.id}`,
        collectorId: user.id,
        lat: profileRow.current_lat,
        lng: profileRow.current_lng,
        label: 'You (Current Location)'
      }] 
    : []

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <header className="sticky top-0 z-10 border-b border-black/[.08] bg-zinc-50/80 backdrop-blur dark:border-white/[.145] dark:bg-black/70">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link className="text-sm font-semibold tracking-tight" href="/">
              Waste Collector
            </Link>
            <span className="rounded-full border border-black/[.08] bg-white px-3 py-1 text-xs text-zinc-700 dark:border-white/[.145] dark:bg-black dark:text-zinc-200">
              Collector
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/collector"
              className="rounded-lg border border-black/[.08] px-4 py-2 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
            >
              Dashboard
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

      <CollectorLiveTracker collectorId={user.id} isTrackingEnabled={hasActivePickup} />

      <main className="mx-auto w-full max-w-6xl space-y-6 px-6 py-8">
        <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <h1 className="text-2xl font-bold tracking-tight">Collector dashboard</h1>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Welcome, {displayName}</div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">Start pickups and mark them complete.</p>
        </div>

        {/* Collector Map View */}
        <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your Route</h2>
            <div className="text-sm text-zinc-600 dark:text-zinc-300">
              {requestMarkers.length > 0 ? `${requestMarkers.length} assigned locations` : 'No assigned locations with coordinates'}
            </div>
          </div>
          <div className="mt-4">
             <MapView 
               markers={requestMarkers} 
               collectorMarkers={collectorMarkers as CollectorMarkerData[]} 
               className="h-[400px] w-full rounded-2xl z-0"
             />
          </div>
        </div>

        {toast && (
          <div
            className={
              toastType === 'success'
                ? 'rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'
                : toastType === 'warning'
                  ? 'rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'
                  : 'rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'
            }
          >
            {toast}
          </div>
        )}

        {error === 'log_failed' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Could not create a pickup log entry. Run supabase_pickup_logs_schema.sql, then try again.
          </div>
        )}

        <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Assigned pickup requests</h2>
            <div className="text-sm text-zinc-600 dark:text-zinc-300">{requests.length} shown</div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/[.08] text-zinc-600 dark:border-white/[.145] dark:text-zinc-300">
                  <th className="py-3 pr-4 font-medium">Address</th>
                  <th className="py-3 pr-4 font-medium">Waste type</th>
                  <th className="py-3 pr-4 font-medium">Request time</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td className="py-6 text-zinc-600 dark:text-zinc-300" colSpan={5}>
                      No assigned pickups yet.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => {
                    const status = String(r.status ?? '').trim()
                    const isVerified = status === 'verified'
                    const isCompleted = status === 'completed'
                    const showVerify = !isVerified && !isCompleted
                    const showComplete = isVerified && !isCompleted

                    return (
                      <tr key={r.id} className="border-b border-black/[.08] dark:border-white/[.145]">
                        <td className="py-4 pr-4">
                          <div className="font-medium">{r.address?.trim() ? r.address : r.id.slice(0, 8)}</div>
                          {r.bins?.code && (
                            <div className="mt-1 text-xs text-zinc-500">
                              Bin: <span className="font-mono">{r.bins.code}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 pr-4">{titleForWasteType(r.waste_type)}</td>
                        <td className="py-4 pr-4 text-xs text-zinc-600 dark:text-zinc-300">{formatDate(r.created_at)}</td>
                        <td className="py-4 pr-4">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs ${
                              isVerified
                                ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                : isCompleted
                                  ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300'
                                  : 'border-black/[.08] bg-white text-zinc-700 dark:border-white/[.145] dark:bg-black dark:text-zinc-200'
                            }`}
                          >
                            {titleForStatus(r.status)}
                          </span>
                        </td>
                        <td className="py-4 pr-4">
                          <div className="flex flex-col gap-2">
                            {showVerify && (
                              <CollectorActions
                                requestId={r.id}
                                hasBinCode={!!r.bins?.code}
                                mode="start"
                                startPickup={startPickup}
                                completePickup={completePickup}
                              />
                            )}
                            {showComplete && (
                              <CollectorActions
                                requestId={r.id}
                                hasBinCode={false}
                                mode="complete"
                                startPickup={startPickup}
                                completePickup={completePickup}
                              />
                            )}
                            {showComplete && (
                               <div className="hidden">
                                 {/* Helper to keep the layout consistent if needed, but CollectorActions handles verify/start/complete buttons */}
                               </div>
                            )}
                            {/* We need to adjust CollectorActions to handle the "Complete" state separately or pass a mode. 
                                Actually, the previous tool created a component that shows EITHER Verify/Start OR nothing. 
                                Let's update the usage to fit the existing logic.
                            */}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

