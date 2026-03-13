'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { useToast } from '../components/toast'

export default function AvatarUploader({
  userId,
  currentAvatarUrl,
}: {
  userId: string
  currentAvatarUrl: string | null
}) {
  const supabase = useMemo(() => createClient(), [])
  const toast = useToast()
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl)

  async function uploadAvatar(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.warning('Please upload an image file.', 'Invalid file type')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.warning('Please upload an image under 2MB.', 'File too large')
      return
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now())
    const path = `${userId}/${id}.${ext}`

    setUploading(true)

    const upload = await supabase.storage.from('avatars').upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    })

    if (upload.error) {
      toast.error(upload.error.message, 'Upload failed')
      setUploading(false)
      return
    }

    const publicUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    const update = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId)

    if (update.error) {
      const msg = update.error.message.toLowerCase()
      const extra = msg.includes('avatar_url')
        ? 'Add an avatar_url column to profiles (see supabase_profiles_avatar.sql).'
        : msg.includes('row-level security') || msg.includes('rls')
          ? 'Your profiles table is blocking updates. Apply the provided profiles RLS policies.'
          : 'Check your database permissions and schema.'

      toast.error(`${update.error.message}\n\n${extra}`, 'Profile update failed')
      setUploading(false)
      return
    }

    setAvatarUrl(publicUrl)
    toast.success('Profile picture updated.')
    setUploading(false)
  }

  return (
    <div className="flex items-center gap-4">
      <div className="h-16 w-16 overflow-hidden rounded-full border border-black/[.08] bg-zinc-100 dark:border-white/[.145] dark:bg-zinc-900/40">
        {avatarUrl ? (
          <Image
            alt="Profile picture"
            src={avatarUrl}
            width={64}
            height={64}
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-zinc-600 dark:text-zinc-300">
            {userId.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Profile picture</div>
        <input
          title="Upload a profile picture"
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            void uploadAvatar(file)
          }}
          className="block w-full text-sm text-zinc-600 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200 dark:text-zinc-300 dark:file:bg-zinc-900/40 dark:file:text-zinc-100 dark:hover:file:bg-zinc-900/60"
        />
        <div className="text-xs text-zinc-600 dark:text-zinc-300">PNG/JPG/WebP up to 2MB.</div>
      </div>
    </div>
  )
}
