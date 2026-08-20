import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { BOOKINGS_BY_TYPE, ALL_BOOKINGS } from '../../../data/mock'
import { PATHS } from '../../../routes/paths'
import { PageHeader, Card } from '../../../components/ui'
import { StatTile } from '../../../components/admin'
import { colors } from '../../../tokens/colors'

const MONTHLY_BOOKINGS = [
  { month: 'Jan', count: 18 },
  { month: 'Feb', count: 22 },
  { month: 'Mar', count: 31 },
  { month: 'Apr', count: 24 },
  { month: 'May', count: 38 },
  { month: 'Jun', count: 45 },
  { month: 'Jul', count: 52 },
  { month: 'Aug', count: 41 },
]

const STATUS_DATA = [
  { name: 'Accepted', value: ALL_BOOKINGS.filter((b) => b.status === 'ACCEPTED').length, color: colors.success },
  { name: 'Pending', value: ALL_BOOKINGS.filter((b) => b.status === 'PENDING').length, color: colors.warning },
  { name: 'Rejected', value: ALL_BOOKINGS.filter((b) => b.status === 'REJECTED').length, color: colors.danger },
  { name: 'Cancelled', value: ALL_BOOKINGS.filter((b) => b.status === 'CANCELLED').length, color: colors.muted },
]

const TILES = [
  { label: 'Total Bookings', value: ALL_BOOKINGS.length, color: colors.navy },
  { label: 'Accepted', value: ALL_BOOKINGS.filter((b) => b.status === 'ACCEPTED').length, color: colors.success },
  { label: 'Pending', value: ALL_BOOKINGS.filter((b) => b.status === 'PENDING').length, color: colors.warning },
  { label: 'Avg Stay (nights)', value: Math.round(ALL_BOOKINGS.reduce((s, b) => s + b.nights, 0) / ALL_BOOKINGS.length), color: colors.accent },
]

export default function AdminBookingStatsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Analytics"
        title="Booking Statistics"
        action={
          <Link to={PATHS.ADMIN.STATS_REVENUE} className="px-4 py-2 text-xs font-semibold border border-navy text-navy rounded-lg hover:bg-navy hover:text-white transition-colors">
            Revenue Stats →
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
        {/* Monthly bookings */}
        <Card className="p-5">
          <h3 className="font-semibold text-navy text-sm mb-4">Monthly Bookings (2026)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MONTHLY_BOOKINGS}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="count" fill={colors.navy} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Bookings by type */}
        <Card className="p-5">
          <h3 className="font-semibold text-navy text-sm mb-4">Bookings by Room Type</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={BOOKINGS_BY_TYPE} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="type" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={72} />
              <Tooltip />
              <Bar dataKey="count" fill={colors.gold} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Status breakdown */}
        <Card className="p-5">
          <h3 className="font-semibold text-navy text-sm mb-4">Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={STATUS_DATA} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                {STATUS_DATA.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Legend formatter={(val) => <span className="text-xs text-slate-600">{val}</span>} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}
