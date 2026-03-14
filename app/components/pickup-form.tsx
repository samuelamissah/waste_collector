'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from './toast'
import MapView from './map-view'

export default function PickupForm({ userId, binId }: { userId: string; binId?: string }) {
  const supabase = createClient()
  const router = useRouter()
  const toast = useToast()
  const [binIdInput, setBinIdInput] = useState(binId ?? '')
  const [wasteType, setWasteType] = useState('general')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy?: number | null } | null>(null)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [loading, setLoading] = useState(false)

  function mapUrlForCoords(lat: number, lng: number) {
    const url = new URL('https://www.openstreetmap.org/')
    url.searchParams.set('mlat', String(lat))
    url.searchParams.set('mlon', String(lng))
    url.hash = `map=18/${lat}/${lng}`
    return url.toString()
  }

  function formatAccuracy(value: number | null | undefined) {
    if (typeof value !== 'number' || Number.isNaN(value)) return ''
    if (value >= 1000) return `±${(value / 1000).toFixed(1)} km`
    return `±${Math.round(value)} m`
  }

  function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const binInput = binIdInput.trim()
    const addressInput = address.trim()

    if (!binInput && !addressInput) {
      toast.warning('Enter a bin code or an address.', 'Missing pickup details')
      setLoading(false)
      return
    }

    let resolvedBinId: string | null = null
    if (binInput) {
      if (isUuid(binInput)) {
        resolvedBinId = binInput
      } else {
        const byCode = await supabase.from('bins').select('id').ilike('code', binInput).maybeSingle()
        if (
          byCode.error &&
          byCode.error.message.toLowerCase().includes('column') &&
          byCode.error.message.toLowerCase().includes('code')
        ) {
          toast.error(
            `${byCode.error.message}\n\nAdd a "code" column to the bins table (see supabase_bins_code.sql), then store codes like BIN-0001 there.`,
            'Bin lookup failed'
          )
          setLoading(false)
          return
        }

        if (byCode.data?.id) resolvedBinId = String(byCode.data.id)
        if (byCode.error) {
          toast.error(byCode.error.message, 'Bin lookup failed')
          setLoading(false)
          return
        }
      }

      if (!resolvedBinId) {
        const suggestionCandidates =
          /^[a-z0-9-]+$/i.test(binInput) && binInput.length <= 32 ? binInput.replaceAll('%', '').replaceAll('_', '') : ''
        const suggestions =
          suggestionCandidates && suggestionCandidates.length >= 2
            ? await supabase
                .from('bins')
                .select('code')
                .ilike('code', `%${suggestionCandidates}%`)
                .limit(5)
            : null

        const suggestionText =
          suggestions && !suggestions.error
            ? (suggestions.data ?? [])
                .map((row) => String((row as { code?: string | null } | null)?.code ?? '').trim())
                .filter((v) => !!v)
            : []

        toast.error(
          `No bin found for "${binInput}". Make sure a row exists in the bins table with code exactly "${binInput}" (common format: BIN-0001).\n\n` +
            (suggestionText.length > 0 ? `Existing bin codes similar to this:\n- ${suggestionText.join('\n- ')}` : ''),
          'Unknown bin code'
        )
        setLoading(false)
        return
      }
    }

    const insertWithLocation = await supabase.from('pickup_requests').insert({
      user_id: userId,
      bin_id: resolvedBinId,
      waste_type: wasteType,
      notes,
      status: 'pending',
      address: addressInput || null,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
    })

    const primaryInsert =
      insertWithLocation.error &&
      insertWithLocation.error.message.toLowerCase().includes('column') &&
      (insertWithLocation.error.message.toLowerCase().includes('latitude') ||
        insertWithLocation.error.message.toLowerCase().includes('longitude'))
        ? await supabase.from('pickup_requests').insert({
            user_id: userId,
            bin_id: resolvedBinId,
            waste_type: wasteType,
            notes,
            status: 'pending',
            address: addressInput || null,
          })
        : insertWithLocation

    if (primaryInsert.error) {
      toast.error(primaryInsert.error.message, 'Request failed')
      setLoading(false)
      return
    }

    setNotes('')
    setAddress('')
    setCoords(null)
    if (!binId) setBinIdInput('')
    setLoading(false)
    router.push('/requests?submitted=1')
  }

  async function getMyLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('Geolocation is not available in this browser.')
      return
    }
    setGettingLocation(true)
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
          resolve()
        },
        (err) => {
          toast.error(err.message || 'Location permission denied.', 'Could not get location')
          resolve()
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
    setGettingLocation(false)
  }

  return (
    <form onSubmit={submitRequest} className="space-y-4">
      {!binId && (
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="binId">
            Bin code
          </label>
          <input
            id="binId"
            className="w-full rounded-lg border border-black/[.08] bg-white p-3 outline-none focus:border-green-700 dark:border-white/[.145] dark:bg-black"
            placeholder="BIN-0001 or bin UUID"
            value={binIdInput}
            onChange={(e) => setBinIdInput(e.target.value)}
          />
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="address">
          Address (optional)
        </label>
        <input
          id="address"
          className="w-full rounded-lg border border-black/[.08] bg-white p-3 outline-none focus:border-green-700 dark:border-white/[.145] dark:bg-black"
          placeholder="Pickup location (required if no bin code)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="wasteType">
          Waste type
        </label>
        <select
          id="wasteType"
          className="w-full rounded-lg border border-black/[.08] bg-white p-3 outline-none focus:border-green-700 dark:border-white/[.145] dark:bg-black"
          value={wasteType}
          onChange={(e) => setWasteType(e.target.value)}
        >
          <option value="general">General Waste</option>
          <option value="recyclable">Recyclable Waste</option>
          <option value="hazardous">Hazardous Waste</option>
        </select>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-sm font-medium">Location (optional)</label>
          <div className="flex items-center gap-2">
            {coords && (
              <button
                type="button"
                onClick={() => setCoords(null)}
                disabled={gettingLocation || loading}
                className="rounded-lg border border-black/[.08] px-3 py-2 text-sm transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.145] dark:hover:bg-white/[.08]"
              >
                Remove
              </button>
            )}
            <button
              type="button"
              onClick={() => void getMyLocation()}
              disabled={gettingLocation || loading}
              className="rounded-lg border border-black/[.08] px-3 py-2 text-sm transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.145] dark:hover:bg-white/[.08]"
            >
              {gettingLocation ? 'Getting location...' : coords ? 'Update location' : 'Use my location'}
            </button>
          </div>
        </div>
        {coords ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border border-black/[.08] bg-white px-3 py-1 text-xs text-zinc-700 dark:border-white/[.145] dark:bg-black dark:text-zinc-200">
              Location attached{formatAccuracy(coords.accuracy) ? ` (${formatAccuracy(coords.accuracy)})` : ''}
            </span>
            <a
              href={mapUrlForCoords(coords.lat, coords.lng)}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-green-700 hover:underline dark:text-green-400"
            >
              View on map
            </a>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </span>
          </div>
        ) : (
          <div className="text-sm text-zinc-600 dark:text-zinc-300">No location attached.</div>
        )}
        {coords && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-black/[.08] dark:border-white/[.145]">
            <MapView
              markers={[{ id: 'pickup_location', lat: coords.lat, lng: coords.lng, label: 'Pickup location' }]}
              center={[coords.lat, coords.lng]}
              zoom={16}
              className="h-[220px] w-full"
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="notes">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          className="w-full rounded-lg border border-black/[.08] bg-white p-3 outline-none focus:border-green-700 dark:border-white/[.145] dark:bg-black"
          placeholder="Any extra details for the collector"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
        />
      </div>

      <button
        className="w-full rounded-lg bg-green-700 px-4 py-3 text-white disabled:bg-zinc-300"
        type="submit"
        disabled={loading}
      >
        {loading ? 'Submitting...' : 'Submit request'}
      </button>
    </form>
  )
}
