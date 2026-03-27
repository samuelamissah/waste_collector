'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function submitReport(prevState: any, formData: FormData) {
  const type = String(formData.get('type') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()

  if (!type || !description) {
    return { error: 'Please fill in all fields' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/report')
  }

  // Try inserting with structured columns
  const structuredInsert = await supabase
    .from('reports')
    .insert({
      user_id: user.id,
      type,
      description,
      status: 'open',
    } as any)

  // Check if insertion failed due to missing columns
  if (
    structuredInsert.error &&
    structuredInsert.error.message.toLowerCase().includes('column') &&
    (structuredInsert.error.message.toLowerCase().includes('type') ||
      structuredInsert.error.message.toLowerCase().includes('description') ||
      structuredInsert.error.message.toLowerCase().includes('status'))
  ) {
    // Fallback: use 'message' column with structured format
    const fallbackInsert = await supabase.from('reports').insert({
      user_id: user.id,
      message: `[${type}] ${description}`,
    })

    if (fallbackInsert.error) {
      console.error('Report submission failed (fallback):', fallbackInsert.error)
      return { error: 'Failed to submit report. Please try again.' }
    }
  } else if (structuredInsert.error) {
    console.error('Report submission failed:', structuredInsert.error)
    return { error: 'Failed to submit report. Please try again.' }
  }

  revalidatePath('/reports')
  revalidatePath('/dashboard')
  redirect('/reports?submitted=1')
}
