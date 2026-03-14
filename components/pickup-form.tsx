'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PickupForm({ userId, binId }: { userId: string; binId: string | null }) {
  const supabase = createClient()
  const [wasteType, setWasteType] = useState<'general' | 'recyclable' | 'hazardous'>('general')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)
    setError(null)

    const insert = await supabase.from('pickup_requests').insert({
      user_id: userId,
      bin_id: binId,
      waste_type: wasteType,
      notes,
      status: 'pending',
    })

    if (insert.error) {
      setError(insert.error.message)
      setLoading(false)
      return
    }

    setNotes('')
    setSuccess(true)
    setLoading(false)
  }

  return (
    <form onSubmit={submitRequest} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="wasteType">
          Waste type
        </label>
        <select
          id="wasteType"
          className="w-full rounded-lg border border-black/[.08] bg-white p-3 outline-none focus:border-green-700 dark:border-white/[.145] dark:bg-black"
          value={wasteType}
          onChange={(e) => setWasteType(e.target.value as 'general' | 'recyclable' | 'hazardous')}
        >
          <option value="general">General Waste</option>
          <option value="recyclable">Recyclable Waste</option>
          <option value="hazardous">Hazardous Waste</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="notes">
          Notes
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

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Pickup request submitted successfully.
        </div>
      )}

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

