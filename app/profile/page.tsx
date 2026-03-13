import { createClient } from '@/lib/supabase/server'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AvatarUploader from './avatar-uploader'

type ProfileRow = {
  id: string
  full_name: string | null
  role: string | null
  eco_points: number | null
  bin_id: string | null
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}) {
  noStore()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/profile')

  const initialProfileFetch = await supabase
    .from('profiles')
    .select('id, full_name, role, eco_points, bin_id, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  let profileRow = initialProfileFetch.data ?? null
  let profileReadError = initialProfileFetch.error?.message ?? null

  if (!profileRow && !profileReadError) {
    const metadata = user.user_metadata as Record<string, unknown>
    const fullNameFromMetadata =
      (typeof metadata?.full_name === 'string' && metadata.full_name.trim()
        ? metadata.full_name.trim()
        : typeof metadata?.name === 'string' && metadata.name.trim()
          ? metadata.name.trim()
          : null) ?? null

    await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          full_name: fullNameFromMetadata,
          role: 'user',
        },
        { onConflict: 'id', ignoreDuplicates: true }
      )

    const refetch = await supabase
      .from('profiles')
      .select('id, full_name, role, eco_points, bin_id, avatar_url')
      .eq('id', user.id)
      .maybeSingle()

    profileRow = refetch.data ?? null
    profileReadError = refetch.error?.message ?? null
  }

  const profile = (profileRow ?? {
    id: user.id,
    full_name: null,
    role: 'user',
    eco_points: 0,
    bin_id: null,
  }) as ProfileRow

  const avatarUrl = (profileRow as unknown as { avatar_url?: string | null })?.avatar_url ?? null
  const role = profile.role ?? 'user'
  const roleLabel = role === 'admin' ? 'Admin' : role === 'collector' ? 'Collector' : 'Resident'
  const metadata = user.user_metadata as Record<string, unknown>
  const metadataName =
    (typeof metadata?.full_name === 'string' && metadata.full_name.trim()
      ? metadata.full_name.trim()
      : typeof metadata?.name === 'string' && metadata.name.trim()
        ? metadata.name.trim()
        : null) ?? null

  const displayName = profile.full_name?.trim() ? profile.full_name : metadataName ?? 'User'

  const sp = (await Promise.resolve(searchParams)) ?? {}
  const updatedParam = sp.updated
  const updated = typeof updatedParam === 'string' ? updatedParam === '1' : false
  const errorParam = sp.error
  const error = typeof errorParam === 'string' ? errorParam : ''

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  async function updateName(formData: FormData) {
    'use server'
    const fullName = String(formData.get('fullName') ?? '').trim()
    if (!fullName) redirect('/profile?error=missing_name')

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login?next=/profile')

    const update = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id)
    if (update.error) redirect('/profile?error=update_failed')

    revalidatePath('/profile')
    revalidatePath('/dashboard')
    redirect('/profile?updated=1')
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <header className="sticky top-0 z-10 border-b border-black/[.08] bg-zinc-50/80 backdrop-blur dark:border-white/[.145] dark:bg-black/70">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link className="text-sm font-semibold tracking-tight" href="/">
              Waste Collector
            </Link>
            <span className="rounded-full border border-black/[.08] bg-white px-3 py-1 text-xs text-zinc-700 dark:border-white/[.145] dark:bg-black dark:text-zinc-200">
              {roleLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg border border-black/[.08] px-4 py-2 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
            >
              Dashboard
            </Link>
            <Link
              href="/requests"
              className="rounded-lg border border-black/[.08] px-4 py-2 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
            >
              History
            </Link>
            <Link
              href="/reports"
              className="rounded-lg border border-black/[.08] px-4 py-2 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
            >
              Reports
            </Link>
            <Link
              href="/profile"
              className="rounded-lg border border-black/[.08] px-4 py-2 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
            >
              Profile
            </Link>
            <form action={signOut}>
              <button className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-6 px-6 py-8">
        {profileReadError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Could not read your profile from the database: {profileReadError}. If this mentions a missing column
            (for example profiles.bin_id), run supabase_profiles_schema.sql. If it mentions RLS, run
            supabase_auth_profiles.sql. Then refresh.
          </div>
        )}
        <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{displayName}</div>

          {updated && (
            <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Profile updated.
            </div>
          )}

          {error === 'missing_name' && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Please enter your name.
            </div>
          )}

          {error === 'update_failed' && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Failed to update profile. Check your database permissions (RLS).
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-black/[.08] bg-white p-6 md:col-span-2 dark:border-white/[.145] dark:bg-black">
            <h2 className="text-lg font-semibold">Your details</h2>
            <div className="mt-4">
              <AvatarUploader userId={user.id} currentAvatarUrl={avatarUrl} />
            </div>
            <form action={updateName} className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="fullName">
                  Full name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  defaultValue={profile.full_name ?? ''}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-black/[.08] bg-white p-3 outline-none focus:border-green-700 dark:border-white/[.145] dark:bg-black"
                />
              </div>
              <button className="rounded-lg bg-green-700 px-4 py-3 text-sm text-white" type="submit">
                Save changes
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <h2 className="text-lg font-semibold">App info</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="text-zinc-600 dark:text-zinc-300">Role</div>
                <div className="font-medium">{roleLabel}</div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="text-zinc-600 dark:text-zinc-300">Eco-points</div>
                <div className="font-medium">{profile.eco_points ?? 0}</div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="text-zinc-600 dark:text-zinc-300">Bin code</div>
                <div className="font-medium">{profile.bin_id ?? 'Not set'}</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
