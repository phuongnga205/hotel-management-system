import { Link } from 'react-router-dom'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { REVENUE_DATA, ALL_BOOKINGS } from '../../../data/mock'
import { PATHS } from '../../../routes/paths'
import { PageHeader, Card } from '../../../components/ui'
import { StatTile } from '../../../components/admin'
import { colors } from '../../../tokens/colors'

const ROOM_REVENUE = [
  { room: 'Single', revenue: 18000 },
  { room: 'Double', revenue: 42000 },
  { room: 'Deluxe', revenue: 78000 },
  { room: 'Suite', revenue: 95000 },
  { room: 'Penthouse', revenue: 62000 },
]

const totalRevenue = REVENUE_DATA.reduce((s, d) => s + d.revenue, 0)
const avgMonthly = Math.round(totalRevenue / REVENUE_DATA.length)
const maxMonth = REVENUE_DATA.reduce((a, b) => a.revenue > b.revenue ? a : b)

const TILES = [
  { label: 'Total Revenue (YTD)', value: `$${(totalRevenue / 1000).toFixed(0)}k`, color: colors.navy },
  { label: 'Avg Monthly', value: `$${(avgMonthly / 1000).toFixed(0)}k`, color: colors.gold },
  { label: 'Best Month', value: maxMonth.month, color: colors.success },
  { label: 'Total Bookings', value: String(ALL_BOOKINGS.length), color: colors.accent },
]

export default function AdminRevenueStatsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Analytics"
        title="Revenue Statistics"
        action={
          <Link to={PATHS.ADMIN.STATS_BOOKINGS} className="px-4 py-2 text-xs font-semibold border border-navy text-navy rounded-lg hover:bg-navy hover:text-white transition-colors">
            Booking Stats →
          </Link>
        }
      />

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {TILES.map((s) => (
          <StatTile key={s.label} label={s.label} value={s.value} color={s.color} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue trend */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold text-navy text-sm mb-4">Revenue Trend (Jan–Aug 2026)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={REVENUE_DATA}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.navy} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={colors.navy} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke={colors.navy} strokeWidth={2} fill="url(#revGrad)" dot={{ r: 4, fill: colors.gold }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Revenue by room type */}
        <Card className="p-5">
          <h3 className="font-semibold text-navy text-sm mb-4">Revenue by Room Type</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ROOM_REVENUE}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="room" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
              <Bar dataKey="revenue" fill={colors.gold} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Revenue breakdown table */}
        <Card className="p-5">
          <h3 className="font-semibold text-navy text-sm mb-4">Monthly Breakdown</h3>
          <div className="space-y-2">
            {REVENUE_DATA.map((d) => (
              <div key={d.month} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-8 shrink-0">{d.month}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full bg-navy" style={{ width: `${(d.revenue / 110000) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-navy w-16 text-right">${(d.revenue / 1000).toFixed(0)}k</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
