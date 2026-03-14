'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function startPickup(formData: FormData) {
  const requestId = String(formData.get('requestId') ?? '').trim()
  const binCodeInput = String(formData.get('binCode') ?? '').trim()
  const lat = String(formData.get('lat') ?? '')
  const lng = String(formData.get('lng') ?? '')

  if (!requestId) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/collector')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const isCollector = me?.role === 'collector'
  const isAdmin = me?.role === 'admin'
  if (!isCollector && !isAdmin) redirect('/collector?toast=Not%20allowed&toast_type=error')

  const { data: requestRow } = await supabase
    .from('pickup_requests')
    .select('id, status, assigned_collector_id, bins(code)')
    .eq('id', requestId)
    .maybeSingle()

  const request = requestRow as {
    id: string
    status: string | null
    assigned_collector_id?: string | null
    bins: { code: string } | { code: string }[] | null
  } | null

  if (!request) redirect('/collector?toast=Request%20not%20found&toast_type=error')
  if (!isAdmin && request.assigned_collector_id !== user.id)
    redirect('/collector?toast=Not%20assigned%20to%20you&toast_type=error')
  if (request.status === 'completed') redirect('/collector?toast=Already%20completed&toast_type=warning')

  // Verify bin code
  const binData = Array.isArray(request.bins) ? request.bins[0] : request.bins
  if (binData?.code) {
    if (!binCodeInput || binCodeInput.toUpperCase() !== binData.code.toUpperCase()) {
      redirect('/collector?toast=Incorrect%20Bin%20Code&toast_type=error')
    }
  }

  const updateData: Record<string, unknown> = { status: 'verified', verified_at: new Date().toISOString() }
  if (lat && lng) {
    updateData.start_location_lat = Number(lat)
    updateData.start_location_lng = Number(lng)
  }

  const update = await supabase
    .from('pickup_requests')
    .update(updateData)
    .eq('id', request.id)

  if (
    update.error &&
    update.error.message.toLowerCase().includes('column') &&
    update.error.message.toLowerCase().includes('verified_at')
  ) {
    const fallback = await supabase.from('pickup_requests').update({ status: 'verified' }).eq('id', request.id)
    if (fallback.error) {
      console.error('Update Fallback Error:', fallback.error)
      const msg = fallback.error.message.toLowerCase()
      if (msg.includes('check constraint') || msg.includes('pickup_requests_status_check')) {
        redirect(
          `/collector?toast=Schema%20Update%20Required:%20Run%20supabase_pickup_requests_status.sql&toast_type=error`
        )
      }
      redirect(`/collector?toast=Update%20failed:%20${encodeURIComponent(fallback.error.message)}&toast_type=error`)
    }
  } else if (update.error) {
    console.error('Update Error:', update.error)
    const msg = update.error.message.toLowerCase()
    if (msg.includes('check constraint') || msg.includes('pickup_requests_status_check')) {
      redirect(
        `/collector?toast=Schema%20Update%20Required:%20Run%20supabase_pickup_requests_status.sql&toast_type=error`
      )
    }
    redirect(`/collector?toast=Update%20failed:%20${encodeURIComponent(update.error.message)}&toast_type=error`)
  }

  const log = await supabase
    .from('pickup_logs')
    .insert({ request_id: request.id, collector_id: user.id, action: 'verified' } as unknown as Record<string, unknown>)

  if (log.error && log.error.message.toLowerCase().includes('column') && log.error.message.toLowerCase().includes('action')) {
    const fallback = await supabase.from('pickup_logs').insert({ request_id: request.id, collector_id: user.id })
    if (fallback.error) {
      console.error('Log Fallback Error:', fallback.error)
      redirect(`/collector?error=log_failed&detail=${encodeURIComponent(fallback.error.message)}`)
    }
  } else if (log.error) {
    console.error('Log Error:', log.error)
    redirect(`/collector?error=log_failed&detail=${encodeURIComponent(log.error.message)}`)
  }

  revalidatePath('/collector')
  redirect('/collector?toast=Pickup%20started&toast_type=success')
}

export async function completePickup(formData: FormData) {
  const requestId = String(formData.get('requestId') ?? '').trim()
  if (!requestId) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/collector')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const isCollector = me?.role === 'collector'
  const isAdmin = me?.role === 'admin'
  if (!isCollector && !isAdmin) redirect('/collector?toast=Not%20allowed&toast_type=error')

  const { data: requestRow } = await supabase
    .from('pickup_requests')
    .select('id, status, assigned_collector_id')
    .eq('id', requestId)
    .maybeSingle()

  const request = requestRow as { id: string; status: string | null; assigned_collector_id?: string | null } | null
  if (!request) redirect('/collector?toast=Request%20not%20found&toast_type=error')
  if (!isAdmin && request.assigned_collector_id !== user.id) redirect('/collector?toast=Not%20assigned%20to%20you&toast_type=error')
  if (request.status === 'completed') redirect('/collector?toast=Already%20completed&toast_type=warning')

  const log = await supabase
    .from('pickup_logs')
    .insert({ request_id: request.id, collector_id: user.id, action: 'completed' } as unknown as Record<string, unknown>)

  if (log.error && log.error.message.toLowerCase().includes('column') && log.error.message.toLowerCase().includes('action')) {
    const fallback = await supabase.from('pickup_logs').insert({ request_id: request.id, collector_id: user.id })
    if (fallback.error) redirect('/collector?error=log_failed')
  } else if (log.error) {
    redirect('/collector?error=log_failed')
  }

  const update = await supabase
    .from('pickup_requests')
    .update({ status: 'completed', completed_at: new Date().toISOString() } as unknown as Record<string, unknown>)
    .eq('id', request.id)

  if (
    update.error &&
    update.error.message.toLowerCase().includes('column') &&
    update.error.message.toLowerCase().includes('completed_at')
  ) {
    const fallback = await supabase.from('pickup_requests').update({ status: 'completed' }).eq('id', request.id)
    if (fallback.error) redirect('/collector?toast=Could%20not%20complete%20pickup&toast_type=error')
  } else if (update.error) {
    redirect('/collector?toast=Could%20not%20complete%20pickup&toast_type=error')
  }

  revalidatePath('/collector')
  redirect('/collector?toast=Pickup%20completed&toast_type=success')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
