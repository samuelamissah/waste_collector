import { createClient } from '@/lib/supabase/server'

export async function createNotification(userId: string, title: string, message: string) {
  const supabase = await createClient()
  
  // We use a try-catch block to ensure notification failures don't block the main action
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      is_read: false,
    })

    if (error) {
      console.error('Failed to create notification:', error)
    }
  } catch (err) {
    console.error('Error creating notification:', err)
  }
}
