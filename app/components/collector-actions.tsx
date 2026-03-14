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

  async function handleStart(formData: FormData) {
    setLoading(true)
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              formData.set('lat', String(pos.coords.latitude))
              formData.set('lng', String(pos.coords.longitude))
              resolve()
            },
            () => resolve(),
            { timeout: 3000 }
          )
        })
      } catch {
        // ignore
      }
    }
    await startPickup(formData)
    setLoading(false)
  }

  async function handleComplete(formData: FormData) {
    setLoading(true)
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              formData.set('lat', String(pos.coords.latitude))
              formData.set('lng', String(pos.coords.longitude))
              resolve()
            },
            () => resolve(),
            { timeout: 3000 }
          )
        })
      } catch {
        // ignore
      }
    }
    await completePickup(formData)
    setLoading(false)
  }

  if (mode === 'complete') {
    return (
      <form action={handleComplete}>
        <input type="hidden" name="requestId" value={requestId} />
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
    <div className="flex flex-col gap-2">
      <form action={handleStart} className="flex flex-col gap-2">
        <input type="hidden" name="requestId" value={requestId} />
        {hasBinCode ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              name="binCode"
              placeholder="Bin Code"
              className="w-24 rounded-md border border-black/[.08] bg-transparent px-2 py-1 text-sm outline-none focus:border-black/30 dark:border-white/[.145] dark:focus:border-white/30"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-zinc-900 px-3 py-1 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-zinc-900 px-3 py-1 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
          >
            {loading ? 'Starting...' : 'Start Pickup'}
          </button>
        )}
      </form>
    </div>
  )
}
