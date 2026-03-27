'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts'

type AnalyticsData = {
  totalPickups: number
  recyclingRate: number
  totalEcoPoints: number
  wasteTypeDistribution: { name: string; value: number }[]
  pickupsOverTime: { date: string; count: number }[]
  topLocations: { address: string; count: number }[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

export default function AdminAnalytics({ data }: { data: AnalyticsData }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Pickups</div>
          <div className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">{data.totalPickups}</div>
        </div>
        <div className="rounded-xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Recycling Rate</div>
          <div className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {data.recyclingRate.toFixed(1)}%
          </div>
        </div>
        <div className="rounded-xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Eco Points</div>
          <div className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {data.totalEcoPoints.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Active Neighborhoods</div>
          <div className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">{data.topLocations.length}</div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Pickups Over Time</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.pickupsOverTime}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E7" />
                <XAxis 
                  dataKey="date" 
                  stroke="#71717A" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="#71717A" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E4E4E7' }}
                  itemStyle={{ color: '#18181B' }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#18181B"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#18181B' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Waste Type Distribution</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.wasteTypeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.wasteTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E4E4E7' }}
                  itemStyle={{ color: '#18181B' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Most Active Locations</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.topLocations} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E4E4E7" />
              <XAxis type="number" stroke="#71717A" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis 
                dataKey="address" 
                type="category" 
                width={150} 
                stroke="#71717A" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E4E4E7' }}
                itemStyle={{ color: '#18181B' }}
                cursor={{ fill: '#F4F4F5' }}
              />
              <Bar dataKey="count" fill="#18181B" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
