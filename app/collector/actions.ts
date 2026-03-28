// app/collector/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function startPickup(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const requestId = formData.get('requestId') as string
  const binCode = formData.get('binCode') as string
  const lat = formData.get('lat') as string
  const lng = formData.get('lng') as string

  if (!requestId) {
    redirect('/collector?error=missing_request_id')
  }

  // Verify the request belongs to this collector
  const { data: request } = await supabase
    .from('pickup_requests')
    .select('status, assigned_collector_id, bin_id, bins(code)')
    .eq('id', requestId)
    .single()

  if (!request) {
    redirect('/collector?error=request_not_found')
  }

  if (request.assigned_collector_id !== user.id) {
    redirect('/collector?error=not_authorized')
  }

  if (request.status === 'completed') {
    redirect('/collector?error=already_completed')
  }

  // Verify bin code if required
  if (binCode) {
    let expectedBinCode = null
    
    // Get expected bin code from the request
    if (request.bins && typeof request.bins === 'object' && 'code' in request.bins) {
      expectedBinCode = (request.bins as { code: string }).code
    } else if (request.bin_id) {
      const { data: bin } = await supabase
        .from('bins')
        .select('code')
        .eq('id', request.bin_id)
        .single()
      expectedBinCode = bin?.code
    }

    if (expectedBinCode && binCode !== expectedBinCode) {
      redirect('/collector?error=bin_code_mismatch')
    }
  }

  // Update the request status to verified
  const { error: updateError } = await supabase
    .from('pickup_requests')
    .update({ 
      status: 'verified',
      start_location_lat: lat ? parseFloat(lat) : null,
      start_location_lng: lng ? parseFloat(lng) : null,
      verified_at: new Date().toISOString()
    })
    .eq('id', requestId)

  if (updateError) {
    console.error('Failed to start pickup:', updateError)
    redirect('/collector?error=update_failed')
  }

  // Log the action
  await supabase
    .from('pickup_logs')
    .insert({
      request_id: requestId,
      collector_id: user.id,
      action: 'started',
      location_lat: lat ? parseFloat(lat) : null,
      location_lng: lng ? parseFloat(lng) : null
    })

  revalidatePath('/collector')
  redirect('/collector?toast=Pickup%20started&toast_type=success')
}

export async function completePickup(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const requestId = formData.get('requestId') as string
  const weightKg = formData.get('weightKg') as string
  const collectorNotes = formData.get('collectorNotes') as string
  const lat = formData.get('lat') as string
  const lng = formData.get('lng') as string

  if (!requestId) {
    redirect('/collector?error=missing_request_id')
  }

  // Verify the request belongs to this collector
  const { data: request } = await supabase
    .from('pickup_requests')
    .select('status, assigned_collector_id, user_id, waste_type')
    .eq('id', requestId)
    .single()

  if (!request) {
    redirect('/collector?error=request_not_found')
  }

  if (request.assigned_collector_id !== user.id) {
    redirect('/collector?error=not_authorized')
  }

  if (request.status !== 'verified') {
    redirect('/collector?error=must_verify_first')
  }

  // Calculate points based on waste type
  const points = request.waste_type === 'recyclable' ? 15 
    : request.waste_type === 'hazardous' ? 10 
    : 5

  // Update the request status to completed
  const { error: updateError } = await supabase
    .from('pickup_requests')
    .update({ 
      status: 'completed',
      end_location_lat: lat ? parseFloat(lat) : null,
      end_location_lng: lng ? parseFloat(lng) : null,
      completed_at: new Date().toISOString(),
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      collector_notes: collectorNotes || null
    })
    .eq('id', requestId)

  if (updateError) {
    console.error('Failed to complete pickup:', updateError)
    redirect('/collector?error=update_failed')
  }

  // Award points to the resident
  const { data: resident } = await supabase
    .from('profiles')
    .select('eco_points')
    .eq('id', request.user_id)
    .single()

  const currentPoints = resident?.eco_points || 0
  await supabase
    .from('profiles')
    .update({ eco_points: currentPoints + points })
    .eq('id', request.user_id)

  // Log the completion
  await supabase
    .from('pickup_logs')
    .insert({
      request_id: requestId,
      collector_id: user.id,
      action: 'completed',
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      notes: collectorNotes || null,
      location_lat: lat ? parseFloat(lat) : null,
      location_lng: lng ? parseFloat(lng) : null
    })

  revalidatePath('/collector')
  redirect('/collector?toast=Pickup%20completed&toast_type=success')
}