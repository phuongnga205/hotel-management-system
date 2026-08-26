import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import { PageLoader } from '../../components/common/PageLoader'
import { StatTile, AdminTable, StatusBadge, BOOKING_STATUS_CONFIG } from '../../components/admin'
import { colors } from '../../tokens/colors'
import { ROUTES } from '../../router/paths'
import { statisticsApi } from '../../api/statistics.api'
import { bookingApi } from '../../api/booking.api'
import { getErrorMessage } from '../../api/errorMessage'
import { formatBucketLabel } from '../../utils/statisticsBucket'
import type { Booking, RevenueBookingsStatistics } from '../../api/types'
import { STATISTICS_PERIOD } from '../../constants/statistics'

export default function AdminDashboardPage() {
  const { t, i18n } = useTranslation('admin')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<RevenueBookingsStatistics | null>(null)
  const [recentBookings, setRecentBookings] = useState<Booking[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      statisticsApi.getRevenueAndBookings({ period: STATISTICS_PERIOD.MONTH, year: new Date().getFullYear() }),
      bookingApi.adminList({ page: 1, limit: 5 }),
    ])
      .then(([statsRes, recent]) => {
        if (cancelled) return
        setStats(statsRes)
        setRecentBookings(recent.items)
      })
      .catch((err) => { if (!cancelled) setError(getErrorMessage(err, t('common.notFoundGeneric'))) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [t])

  if (loading) return <PageLoader />
  if (error || !stats) return <p className="text-danger text-sm">{error}</p>

  const revenueChartData = stats.buckets.map((b) => ({ label: formatBucketLabel(b.label, stats.period), revenue: Number(b.revenue) }))
  const bookingsChartData = stats.buckets.map((b) => ({ label: formatBucketLabel(b.label, stats.period), count: b.bookingCount }))

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('dashboard.eyebrow')} title={t('dashboard.title')} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatTile label={t('dashboard.totalRevenue')} value={`$${(Number(stats.totalRevenue) / 1000).toFixed(0)}k`} color={colors.navy} />
        <StatTile label={t('dashboard.newBookings')} value={String(stats.totalBookings)} color={colors.gold} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="font-semibold text-navy text-sm mb-4">{t('dashboard.monthlyRevenue')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v / 1000}k`} />
              <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, t('dashboard.totalRevenue')]} />
              <Line type="monotone" dataKey="revenue" stroke={colors.navy} strokeWidth={2} dot={{ r: 4, fill: colors.gold }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-navy text-sm mb-4">{t('dashboard.bookingsTrend')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={bookingsChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill={colors.navy} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-navy text-sm">{t('dashboard.recentBookings')}</h3>
          <Link to={ROUTES.ADMIN.BOOKINGS} className="text-xs text-gold hover:underline">{t('dashboard.viewAll')}</Link>
        </div>
        <AdminTable
          rowKey={(b: Booking) => b.id}
          rows={recentBookings}
          columns={[
            { key: 'id', header: t('table.id'), render: (b) => <span className="font-mono text-xs font-semibold text-navy">#{b.id}</span> },
            { key: 'guest', header: t('table.guest'), render: (b) => b.user?.fullName ?? b.user?.email ?? '—' },
            { key: 'room', header: t('table.room'), render: (b) => b.room?.name ?? '—' },
            {
              key: 'dates',
              header: t('table.dates'),
              render: (b) =>
                `${new Date(b.checkInDate).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })} → ${new Date(b.checkOutDate).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}`,
            },
            { key: 'total', header: t('table.total'), render: (b) => `$${Number(b.totalPrice).toLocaleString()}` },
            { key: 'status', header: t('common.status'), render: (b) => <StatusBadge status={b.status} config={BOOKING_STATUS_CONFIG} /> },
          ]}
        />
      </Card>
    </div>
  )
}
