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
import type { Booking, BookingStatistics, RevenueStatistics } from '../../api/types'

export default function AdminDashboardPage() {
  const { t, i18n } = useTranslation('admin')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookingStats, setBookingStats] = useState<BookingStatistics | null>(null)
  const [revenueStats, setRevenueStats] = useState<RevenueStatistics | null>(null)
  const [recentBookings, setRecentBookings] = useState<Booking[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([statisticsApi.bookings(), statisticsApi.revenue(), bookingApi.adminList({ page: 1, limit: 5 })])
      .then(([bs, rs, recent]) => {
        if (cancelled) return
        setBookingStats(bs)
        setRevenueStats(rs)
        setRecentBookings(recent.items)
      })
      .catch((err) => { if (!cancelled) setError(getErrorMessage(err, t('common.notFoundGeneric'))) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [t])

  if (loading) return <PageLoader />
  if (error || !bookingStats || !revenueStats) return <p className="text-danger text-sm">{error}</p>

  const statusData = (Object.entries(bookingStats.byStatus) as [keyof typeof bookingStats.byStatus, number][]).map(([status, count]) => ({
    status,
    count,
  }))

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('dashboard.eyebrow')} title={t('dashboard.title')} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatTile label={t('dashboard.totalRevenue')} value={`$${(revenueStats.totalRevenue / 1000).toFixed(0)}k`} color={colors.navy} />
        <StatTile
          label={t('dashboard.newBookings')}
          value={String(bookingStats.totalBookings)}
          sub={t('dashboard.pendingBookingsSub', { count: bookingStats.byStatus.PENDING })}
          color={colors.gold}
        />
        <StatTile label={t('statistics.bookings.tileAccepted')} value={String(bookingStats.byStatus.ACCEPTED)} color={colors.success} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="font-semibold text-navy text-sm mb-4">{t('dashboard.monthlyRevenue')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={revenueStats.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v / 1000}k`} />
              <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, t('dashboard.totalRevenue')]} />
              <Line type="monotone" dataKey="revenue" stroke={colors.navy} strokeWidth={2} dot={{ r: 4, fill: colors.gold }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-navy text-sm mb-4">{t('statistics.bookings.statusBreakdownTitle')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="status" tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} />
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
            { key: 'total', header: t('table.total'), render: (b) => `$${b.totalPrice.toLocaleString()}` },
            { key: 'status', header: t('common.status'), render: (b) => <StatusBadge status={b.status} config={BOOKING_STATUS_CONFIG} /> },
          ]}
        />
      </Card>
    </div>
  )
}
