'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PickupForm({ userId, binId }: { userId: string; binId: string }) {
  const supabase = createClient()
  const [wasteType, setWasteType] = useState('general')
  const [notes, setNotes] = useState('')

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault()

    const { error } = await supabase.from('pickup_requests').insert({
      user_id: userId,
      bin_id: binId,
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
    <form onSubmit={submitRequest} className="space-y-4 rounded-2xl border p-6">
      <h2 className="text-xl font-semibold">Request Pickup</h2>

      <select
        className="w-full rounded-lg border p-3"
        value={wasteType}
        onChange={(e) => setWasteType(e.target.value)}
      >
        <option value="general">General Waste</option>
        <option value="recyclable">Recyclable Waste</option>
        <option value="hazardous">Hazardous Waste</option>
      </select>

      <textarea
        className="w-full rounded-lg border p-3"
        placeholder="Extra notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <button className="rounded-lg bg-green-700 px-4 py-3 text-white">
        Submit Request
      </button>
    </form>
  )
}