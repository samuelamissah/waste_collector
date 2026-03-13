'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PickupForm({ userId, binId }: { userId: string; binId?: string }) {
  const supabase = createClient()
  const [binIdInput, setBinIdInput] = useState(binId ?? '')
  const [wasteType, setWasteType] = useState('general')
  const [notes, setNotes] = useState('')

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault()

    if (!binIdInput.trim()) {
      alert('Please enter a bin ID')
      return
    }

    const { error } = await supabase.from('pickup_requests').insert({
      user_id: userId,
      bin_id: binIdInput.trim(),
      waste_type: wasteType,
      notes,
      status: 'pending',
    })

    if (error) {
      alert(error.message)
      return
    }

    alert('Pickup request submitted')
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
            placeholder="BIN-0001"
            value={binIdInput}
            onChange={(e) => setBinIdInput(e.target.value)}
          />
        </div>
      )}

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

      <button className="w-full rounded-lg bg-green-700 px-4 py-3 text-white">
        Submit Request
      </button>
    </form>
  )
}
