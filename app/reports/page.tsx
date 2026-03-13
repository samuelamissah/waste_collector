import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

type ReportRow = {
  id: string
  user_id: string
  message: string | null
  created_at?: string | null
}

function formatDate(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  const role = profileRow?.role ?? 'user'
  const submittedParam = searchParams?.submitted
  const submitted = typeof submittedParam === 'string' ? submittedParam === '1' : false

  async function submitReport(formData: FormData) {
    'use server'
    const reportType = String(formData.get('type') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()
    if (!reportType || !description) return

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const message = `[${reportType}] ${description}`
    const insert = await supabase.from('reports').insert({ user_id: user.id, message })
    if (insert.error) return

    revalidatePath('/reports')
    revalidatePath('/dashboard')
    redirect('/reports?submitted=1')
  }

  const baseQuery = supabase
    .from('reports')
    .select('id, user_id, message, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: reportsData } =
    role === 'admin' ? await baseQuery : await baseQuery.eq('user_id', user.id)

  const reports = (reportsData ?? []) as ReportRow[]

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="rounded-2xl border p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Reports{profileRow?.full_name ? ` — ${profileRow.full_name}` : ''}
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                Report illegal dumping, missed pickup, or overflowing public bins.
              </p>
            </div>
            <a className="rounded-lg border px-4 py-2 text-sm" href="/dashboard">
              Back to dashboard
            </a>
          </div>
          {submitted && (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              Report submitted.
            </div>
          )}
        </div>

        {role !== 'admin' && (
          <div className="rounded-2xl border p-6">
            <h2 className="text-lg font-semibold">Submit a report</h2>
            <form action={submitReport} className="mt-4 space-y-4">
              <select className="w-full rounded-lg border p-3" name="type" defaultValue="">
                <option value="" disabled>
                  Select type
                </option>
                <option value="illegal_dumping">Illegal dumping</option>
                <option value="missed_pickup">Missed pickup</option>
                <option value="overflowing_public_bin">Overflowing public bin</option>
              </select>

              <textarea
                className="w-full rounded-lg border p-3"
                name="description"
                placeholder="Describe what happened and where"
                rows={5}
              />

              <button className="rounded-lg bg-green-700 px-4 py-3 text-white" type="submit">
                Submit report
              </button>
            </form>
          </div>
        )}

        <div className="rounded-2xl border p-6">
          <h2 className="text-lg font-semibold">{role === 'admin' ? 'All reports' : 'Your reports'}</h2>
          <div className="mt-4 space-y-3">
            {reports.length === 0 ? (
              <div className="text-sm text-zinc-600">No reports yet.</div>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-medium">
                      {role === 'admin' ? r.user_id.slice(0, 8) : 'You'}
                    </div>
                    <div className="text-xs text-zinc-600">{formatDate(r.created_at ?? null)}</div>
                  </div>
                  <div className="mt-2 text-sm text-zinc-700">{r.message ?? ''}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

