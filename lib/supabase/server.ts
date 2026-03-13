import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseUrl =
    envUrl.startsWith('http://') || envUrl.startsWith('https://')
      ? envUrl
      : 'http://localhost:54321'

  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const supabaseAnonKey = envKey.trim() ? envKey : 'public-anon-key'

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
