// app/components/collector-actions.tsx
'use client'

import { useState } from 'react'

export default function CollectorActions({
  requestId,
  hasBinCode,
  mode,
  startPickup,
  completePickup,
}: {
  requestId: string
  hasBinCode: boolean
  mode: 'start' | 'complete'
  startPickup: (formData: FormData) => Promise<void>
  completePickup: (formData: FormData) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const [binCode, setBinCode] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [collectorNotes, setCollectorNotes] = useState('')

  async function handleStart(formData: FormData) {
    setLoading(true)
    
    // Get geolocation if available
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        })
        formData.set('lat', String(position.coords.latitude))
        formData.set('lng', String(position.coords.longitude))
      } catch {
        console.warn('Geolocation failed, proceeding without location')
      }
    }
    
    await startPickup(formData)
    setLoading(false)
  }

  async function handleComplete(formData: FormData) {
    setLoading(true)
    
    // Get geolocation if available
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        })
        formData.set('lat', String(position.coords.latitude))
        formData.set('lng', String(position.coords.longitude))
      } catch {
        console.warn('Geolocation failed, proceeding without location')
      }
    }
    
    await completePickup(formData)
    setLoading(false)
  }

  if (mode === 'complete') {
    return (
      <form action={handleComplete} className="flex flex-col gap-2">
        <input type="hidden" name="requestId" value={requestId} />
        <input
          type="text"
          name="weightKg"
          placeholder="Weight (kg)"
          value={weightKg}
          onChange={(e) => setWeightKg(e.target.value)}
          className="w-32 rounded-lg border border-black/[.08] bg-white px-2 py-1 text-sm outline-none focus:border-green-700 dark:border-white/[.145] dark:bg-black"
        />
        <input
          type="text"
          name="collectorNotes"
          placeholder="Notes"
          value={collectorNotes}
          onChange={(e) => setCollectorNotes(e.target.value)}
          className="w-40 rounded-lg border border-black/[.08] bg-white px-2 py-1 text-sm outline-none focus:border-green-700 dark:border-white/[.145] dark:bg-black"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Completing...' : 'Complete'}
        </button>
      </form>
    )
  }

  return (
    <form action={handleStart} className="flex flex-col gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      {hasBinCode && (
        <input
          type="text"
          name="binCode"
          placeholder="Bin Code"
          value={binCode}
          onChange={(e) => setBinCode(e.target.value)}
          className="w-28 rounded-lg border border-black/[.08] bg-white px-2 py-1 text-sm outline-none focus:border-green-700 dark:border-white/[.145] dark:bg-black"
          required
        />
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-zinc-900 px-3 py-1 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
      >
        {loading ? 'Starting...' : 'Start Pickup'}
      </button>
    </form>
  )
}