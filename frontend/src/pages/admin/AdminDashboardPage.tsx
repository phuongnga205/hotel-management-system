import { Link } from 'react-router-dom'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ALL_BOOKINGS, REVENUE_DATA, BOOKINGS_BY_TYPE } from '../../data/mock'
import { BookingStatusBadge, PageHeader, Card } from '../../components/ui'
import { StatTile } from '../../components/admin'
import PaymentBadge from '../../components/PaymentBadge'
import { colors } from '../../tokens/colors'
import { PATHS } from '../../routes/paths'

const STATS = [
  { label: 'Total Revenue', value: '$142k', sub: '+12.4% vs last month', color: colors.navy },
  { label: 'New Bookings', value: String(ALL_BOOKINGS.length), sub: `${ALL_BOOKINGS.filter((b) => b.status === 'PENDING').length} pending review`, color: colors.gold },
  { label: 'Active Guests', value: '38', sub: '6 checking in today', color: colors.success },
  { label: 'Pending Reviews', value: '2', sub: 'Awaiting moderation', color: colors.accent },
]

export default function AdminDashboardPage() {
  const recentBookings = ALL_BOOKINGS.slice(0, 5)

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Overview" title="Dashboard" subtitle="August 18, 2026" />

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <StatTile key={s.label} label={s.label} value={s.value} sub={s.sub} color={s.color} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="font-semibold text-navy text-sm mb-4">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={REVENUE_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke={colors.navy} strokeWidth={2} dot={{ r: 4, fill: colors.gold }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-navy text-sm mb-4">Bookings by Room Type</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={BOOKINGS_BY_TYPE}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="type" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="count" fill={colors.navy} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent bookings */}
      <Card>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-navy text-sm">Recent Bookings</h3>
          <Link to={PATHS.ADMIN.BOOKINGS} className="text-xs text-gold hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                {['ID', 'Guest', 'Room', 'Dates', 'Total', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((b, i) => (
                <tr key={b.id} className={`border-b border-slate-50 hover:bg-surface transition-colors ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-navy">#{b.id}</td>
                  <td className="px-4 py-3 font-medium text-navy whitespace-nowrap">{b.guestName}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{b.roomName}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(b.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {new Date(b.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 font-semibold text-navy">${b.totalPrice.toLocaleString()}</td>
                  <td className="px-4 py-3"><BookingStatusBadge status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
