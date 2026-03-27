'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from './toast'

type AdminBinRow = {
  id: string
  code: string | null
  address?: string | null
}

type AdminUserRow = {
  id: string
  full_name: string | null
  role: string | null
  bin_id: string | null
}

function normalizeRole(role: string | null | undefined) {
  const value = String(role ?? '').trim()
  if (value === 'admin' || value === 'collector' || value === 'user') return value
  return 'user'
}

function labelForBin(bin: AdminBinRow) {
  const code = String(bin.code ?? '').trim()
  const address = String(bin.address ?? '').trim()
  if (code && address) return `${code} • ${address}`
  return code || address || '—'
}

export default function AdminUserManager({
  currentUserId,
  initialUsers,
  initialBins,
}: {
  currentUserId: string
  initialUsers: AdminUserRow[]
  initialBins: AdminBinRow[]
}) {
  const toast = useToast()
  const supabase = useMemo(() => createClient(), [])

  const [users, setUsers] = useState<AdminUserRow[]>(initialUsers)
  const [bins, setBins] = useState<AdminBinRow[]>(initialBins)
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [reloading, setReloading] = useState(false)

  const [draft, setDraft] = useState<Record<string, { role: string; binId: string }>>(() => {
    const next: Record<string, { role: string; binId: string }> = {}
    initialUsers.forEach((u) => {
      next[u.id] = { role: normalizeRole(u.role), binId: u.bin_id ?? 'none' }
    })
    return next
  })

  async function reload() {
    setReloading(true)
    const [{ data: usersData, error: usersError }, { data: binsData, error: binsError }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, role, bin_id').order('full_name', { ascending: true }).limit(500),
      supabase.from('bins').select('id, code, address').order('code', { ascending: true }).limit(500),
    ])

    if (usersError) toast.error(usersError.message, 'Could not load users')
    if (binsError) toast.error(binsError.message, 'Could not load bins')

    if (!usersError) {
      const nextUsers = (usersData ?? []) as AdminUserRow[]
      setUsers(nextUsers)
      setDraft((prev) => {
        const next = { ...prev }
        nextUsers.forEach((u) => {
          next[u.id] = { role: normalizeRole(u.role), binId: u.bin_id ?? 'none' }
        })
        return next
      })
    }
    if (!binsError) setBins(((binsData ?? []) as unknown as AdminBinRow[]) ?? [])

    setReloading(false)
  }

  async function save(userId: string) {
    const entry = draft[userId]
    if (!entry) return

    if (userId === currentUserId && entry.role !== 'admin') {
      toast.warning('You cannot remove your own admin role.')
      setDraft((prev) => ({ ...prev, [userId]: { ...prev[userId], role: 'admin' } }))
      return
    }

    setLoadingIds((prev) => new Set(prev).add(userId))

    const nextRole = normalizeRole(entry.role)
    const nextBinId = entry.binId === 'none' ? null : entry.binId

    const update = await supabase
      .from('profiles')
      .update({ role: nextRole, bin_id: nextBinId } as unknown as Record<string, unknown>)
      .eq('id', userId)

    if (update.error) {
      toast.error(update.error.message, 'Update failed')
      setLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
      return
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: nextRole, bin_id: nextBinId } : u))
    )
    toast.success('User updated.')
    setLoadingIds((prev) => {
      const next = new Set(prev)
      next.delete(userId)
      return next
    })
  }

  return (
    <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Users</h2>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Assign roles and bins.</div>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-lg border border-black/[.08] px-4 py-2 text-sm transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.145] dark:hover:bg-white/[.08]"
          disabled={reloading}
        >
          {reloading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/[.08] text-zinc-600 dark:border-white/[.145] dark:text-zinc-300">
              <th className="py-3 pr-4 font-medium">Name</th>
              <th className="py-3 pr-4 font-medium">Role</th>
              <th className="py-3 pr-4 font-medium">Bin</th>
              <th className="py-3 pr-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td className="py-6 text-zinc-600 dark:text-zinc-300" colSpan={4}>
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const entry = draft[u.id] ?? { role: normalizeRole(u.role), binId: u.bin_id ?? 'none' }
                const isSaving = loadingIds.has(u.id)
                return (
                  <tr key={u.id} className="border-b border-black/[.08] dark:border-white/[.145]">
                    <td className="py-4 pr-4">
                      <div className="font-medium">{u.full_name?.trim() ? u.full_name : u.id.slice(0, 8)}</div>
                      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                        {u.id.slice(0, 8)}
                        {u.id === currentUserId ? ' • You' : ''}
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <select
                      title="ldskm"
                        value={entry.role}
                        onChange={(e) =>
                          setDraft((prev) => ({ ...prev, [u.id]: { ...entry, role: e.target.value } }))
                        }
                        disabled={isSaving}
                        className="rounded-lg border border-black/[.08] bg-white px-3 py-2 dark:border-white/[.145] dark:bg-black"
                      >
                        <option value="user">Resident</option>
                        <option value="collector">Collector</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-4 pr-4">
                      <select
                      title="jd"
                        value={entry.binId}
                        onChange={(e) =>
                          setDraft((prev) => ({ ...prev, [u.id]: { ...entry, binId: e.target.value } }))
                        }
                        disabled={isSaving}
                        className="min-w-56 rounded-lg border border-black/[.08] bg-white px-3 py-2 dark:border-white/[.145] dark:bg-black"
                      >
                        <option value="none">No bin</option>
                        {bins.map((b) => (
                          <option key={b.id} value={b.id}>
                            {labelForBin(b)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-4 pr-4">
                      <button
                        type="button"
                        onClick={() => void save(u.id)}
                        disabled={isSaving}
                        className="rounded-lg border border-black/[.08] px-3 py-2 text-sm transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.145] dark:hover:bg-white/[.08]"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
