'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from './toast'

type ReportStatus = 'open' | 'under_review' | 'resolved'

type AdminReportRow = {
  id: string
  user_id: string
  type?: string | null
  description?: string | null
  message?: string | null
  status?: string | null
  created_at?: string | null
}

type AdminReporterRow = {
  id: string
  full_name: string | null
}

function normalizeStatus(value: string | null | undefined): ReportStatus {
  const v = String(value ?? '').trim()
  if (v === 'under_review' || v === 'resolved' || v === 'open') return v
  return 'open'
}

function formatDate(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

function labelForReportType(value: string | null | undefined) {
  const v = String(value ?? '').trim()
  if (!v) return ''
  if (v === 'illegal_dumping') return 'Illegal dumping'
  if (v === 'missed_pickup') return 'Missed pickup'
  if (v === 'overflowing_public_bin') return 'Overflowing public bin'
  return v.replaceAll('_', ' ').replaceAll('-', ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

function parseLegacyMessage(value: string | null | undefined) {
  const raw = String(value ?? '').trim()
  if (!raw) return { type: '', description: '' }
  const match = raw.match(/^\[([^\]]+)\]\s*(.*)$/)
  if (!match) return { type: '', description: raw }
  return { type: match[1] ?? '', description: (match[2] ?? '').trim() || raw }
}

export default function AdminReportsManager({
  initialReports,
  initialReporterNames,
  initialStatusColumnMissing,
}: {
  initialReports: AdminReportRow[]
  initialReporterNames: Record<string, string>
  initialStatusColumnMissing: boolean
}) {
  const toast = useToast()
  const supabase = useMemo(() => createClient(), [])

  const [reports, setReports] = useState<AdminReportRow[]>(initialReports)
  const [reporterNames, setReporterNames] = useState<Record<string, string>>(initialReporterNames)
  const [statusColumnMissing, setStatusColumnMissing] = useState<boolean>(initialStatusColumnMissing)
  const [filter, setFilter] = useState<'all' | ReportStatus>('all')
  const [reloading, setReloading] = useState(false)
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())

  const [draft, setDraft] = useState<Record<string, ReportStatus>>(() => {
    const next: Record<string, ReportStatus> = {}
    initialReports.forEach((r) => {
      next[r.id] = normalizeStatus(r.status)
    })
    return next
  })

  const visibleReports = reports.filter((r) => (filter === 'all' ? true : normalizeStatus(r.status) === filter))

  async function reload() {
    setReloading(true)
    const withStatus = await supabase
      .from('reports')
      .select('id, user_id, type, description, message, status, created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (withStatus.error) {
      const message = withStatus.error.message.toLowerCase()
      if (message.includes('column') && message.includes('status')) {
        setStatusColumnMissing(true)
        const fallback = await supabase
          .from('reports')
          .select('id, user_id, message, created_at')
          .order('created_at', { ascending: false })
          .limit(200)
        if (fallback.error) {
          toast.error(fallback.error.message, 'Could not load reports')
          setReloading(false)
          return
        }
        const nextReports = (fallback.data ?? []) as AdminReportRow[]
        setReports(nextReports)
        setDraft((prev) => {
          const next = { ...prev }
          nextReports.forEach((r) => {
            next[r.id] = next[r.id] ?? 'open'
          })
          return next
        })
      } else if (message.includes('column') && (message.includes('type') || message.includes('description'))) {
        const fallback = await supabase
          .from('reports')
          .select('id, user_id, message, status, created_at')
          .order('created_at', { ascending: false })
          .limit(200)
        if (fallback.error) {
          toast.error(fallback.error.message, 'Could not load reports')
          setReloading(false)
          return
        }
        const nextReports = (fallback.data ?? []) as AdminReportRow[]
        setReports(nextReports)
      } else if (message.includes('column') && message.includes('message')) {
        const fallback = await supabase
          .from('reports')
          .select('id, user_id, type, description, status, created_at')
          .order('created_at', { ascending: false })
          .limit(200)
        if (fallback.error) {
          toast.error(fallback.error.message, 'Could not load reports')
          setReloading(false)
          return
        }
        const nextReports = (fallback.data ?? []) as AdminReportRow[]
        setReports(nextReports)
      } else {
        toast.error(withStatus.error.message, 'Could not load reports')
      }
      setReloading(false)
      return
    }

    setStatusColumnMissing(false)
    const nextReports = (withStatus.data ?? []) as AdminReportRow[]
    setReports(nextReports)
    setDraft((prev) => {
      const next = { ...prev }
      nextReports.forEach((r) => {
        next[r.id] = normalizeStatus(r.status)
      })
      return next
    })

    const reporterIds = [...new Set(nextReports.map((r) => r.user_id).filter((v) => !!v))]
    const unknownIds = reporterIds.filter((id) => !(id in reporterNames))
    if (unknownIds.length > 0) {
      const profiles = await supabase.from('profiles').select('id, full_name').in('id', unknownIds).limit(500)
      if (!profiles.error) {
        const rows = (profiles.data ?? []) as AdminReporterRow[]
        setReporterNames((prev) => {
          const next = { ...prev }
          rows.forEach((p) => {
            next[p.id] = p.full_name?.trim() ? p.full_name : 'User'
          })
          unknownIds.forEach((id) => {
            if (!next[id]) next[id] = 'User'
          })
          return next
        })
      }
    }

    setReloading(false)
  }

  async function save(reportId: string) {
    if (statusColumnMissing) {
      toast.error('Apply supabase_reports_schema.sql and supabase_admin_full_access.sql, then refresh.')
      return
    }
    const nextStatus = draft[reportId] ?? 'open'
    setSavingIds((prev) => new Set(prev).add(reportId))

    const update = await supabase
      .from('reports')
      .update({ status: nextStatus, updated_at: new Date().toISOString() } as unknown as Record<string, unknown>)
      .eq('id', reportId)

    if (update.error) {
      const msg = update.error.message.toLowerCase()
      if (msg.includes('column') && msg.includes('status')) {
        setStatusColumnMissing(true)
        toast.error('Apply supabase_reports_schema.sql, then refresh.')
      } else {
        toast.error(update.error.message, 'Update failed')
      }
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(reportId)
        return next
      })
      return
    }

    setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: nextStatus } : r)))
    toast.success('Report updated.')
    setSavingIds((prev) => {
      const next = new Set(prev)
      next.delete(reportId)
      return next
    })
  }

  return (
    <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Reports</h2>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Track and resolve resident issues.</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            title="Filter reports by status"
            className="rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm dark:border-white/[.145] dark:bg-black"
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | ReportStatus)}
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="under_review">Under review</option>
            <option value="resolved">Resolved</option>
          </select>
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-lg border border-black/[.08] px-4 py-2 text-sm transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.145] dark:hover:bg-white/[.08]"
            disabled={reloading}
          >
            {reloading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {statusColumnMissing && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Reports status is not enabled in your database. Apply supabase_reports_schema.sql and supabase_admin_full_access.sql, then refresh.
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/[.08] text-zinc-600 dark:border-white/[.145] dark:text-zinc-300">
              <th className="py-3 pr-4 font-medium">Reporter</th>
              <th className="py-3 pr-4 font-medium">Message</th>
              <th className="py-3 pr-4 font-medium">Status</th>
              <th className="py-3 pr-4 font-medium">Created</th>
              <th className="py-3 pr-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleReports.length === 0 ? (
              <tr>
                <td className="py-6 text-zinc-600 dark:text-zinc-300" colSpan={5}>
                  No reports.
                </td>
              </tr>
            ) : (
              visibleReports.map((r) => {
                const current = normalizeStatus(r.status)
                const value = draft[r.id] ?? current
                const saving = savingIds.has(r.id)
                return (
                  <tr key={r.id} className="border-b border-black/[.08] align-top dark:border-white/[.145]">
                    <td className="py-4 pr-4">
                      <div className="font-medium">{reporterNames[r.user_id] ?? 'User'}</div>
                      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{r.user_id.slice(0, 8)}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="text-sm text-zinc-700 dark:text-zinc-200">
                        <div className="flex flex-wrap items-start gap-2">
                          {(labelForReportType(r.type) || labelForReportType(parseLegacyMessage(r.message).type)) && (
                            <span className="rounded-full border border-black/[.08] bg-white px-2 py-0.5 text-xs text-zinc-700 dark:border-white/[.145] dark:bg-black dark:text-zinc-200">
                              {labelForReportType(r.type) || labelForReportType(parseLegacyMessage(r.message).type)}
                            </span>
                          )}
                          <span>
                            {r.description?.trim()
                              ? r.description
                              : r.message?.trim()
                                ? parseLegacyMessage(r.message).description || r.message
                                : ''}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{r.id.slice(0, 8)}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <select
                        title='Change status of report'
                        className="rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm dark:border-white/[.145] dark:bg-black"
                        value={value}
                        onChange={(e) =>
                          setDraft((prev) => ({ ...prev, [r.id]: normalizeStatus(e.target.value) }))
                        }
                        disabled={saving || statusColumnMissing}
                      >
                        <option value="open">Open</option>
                        <option value="under_review">Under review</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </td>
                    <td className="py-4 pr-4 text-xs text-zinc-600 dark:text-zinc-300">{formatDate(r.created_at)}</td>
                    <td className="py-4 pr-4">
                      <button
                        type="button"
                        onClick={() => void save(r.id)}
                        className="rounded-lg border border-black/[.08] px-3 py-2 text-sm transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.145] dark:hover:bg-white/[.08]"
                        disabled={saving || statusColumnMissing}
                      >
                        {saving ? 'Saving...' : 'Save'}
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
