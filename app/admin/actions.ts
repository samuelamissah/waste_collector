'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createNotification } from '@/lib/notifications'

export async function assignCollector(formData: FormData) {
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
    .select('id, status, user_id')
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

  // Notify resident that a collector has been assigned
  await createNotification(
    requestRow.user_id,
    'Collector Assigned',
    'A collector has been assigned to your pickup request.'
  )
  
  // Also notify the collector!
  await createNotification(
    collectorId,
    'New Assignment',
    'You have been assigned a new pickup request.'
  )

  revalidatePath('/admin')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
