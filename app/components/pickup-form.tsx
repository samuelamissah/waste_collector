'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from './toast'

export default function PickupForm({ userId, binId }: { userId: string; binId?: string }) {
  const supabase = createClient()
  const router = useRouter()
  const toast = useToast()
  const [binIdInput, setBinIdInput] = useState(binId ?? '')
  const [wasteType, setWasteType] = useState('general')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [loading, setLoading] = useState(false)

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

  async function useMyLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('Geolocation is not available in this browser.')
      return
    }
    setGettingLocation(true)
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
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
          <button
            type="button"
            onClick={() => void useMyLocation()}
            disabled={gettingLocation || loading}
            className="rounded-lg border border-black/[.08] px-3 py-2 text-sm transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.145] dark:hover:bg-white/[.08]"
          >
            {gettingLocation ? 'Getting location...' : 'Use my location'}
          </button>
        </div>
        <div className="text-sm text-zinc-600 dark:text-zinc-300">
          {coords ? `Lat ${coords.lat.toFixed(6)}, Lng ${coords.lng.toFixed(6)}` : 'No location attached.'}
        </div>
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
