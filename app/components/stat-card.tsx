export default function StatCard({ title, value, colorClass }: { title: string; value: string | number; colorClass?: string }) {
  return (
    <div className="rounded-3xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
      <div className="text-sm text-zinc-600 dark:text-zinc-300">{title}</div>
      <div className={`mt-1 text-3xl font-bold ${colorClass || ''}`}>{value}</div>
    </div>
  )
}
