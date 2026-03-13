import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseUrl =
    envUrl.startsWith('http://') || envUrl.startsWith('https://')
      ? envUrl
      : 'http://localhost:54321'

  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const supabaseAnonKey = envKey.trim() ? envKey : 'public-anon-key'

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
}
