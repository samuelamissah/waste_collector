'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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

  revalidatePath('/admin')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
