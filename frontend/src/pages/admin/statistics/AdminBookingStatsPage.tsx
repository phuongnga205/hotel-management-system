import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import PageHeader from '../../../components/PageHeader'
import Card from '../../../components/Card'
import { PageLoader } from '../../../components/common/PageLoader'
import { StatTile } from '../../../components/admin'
import { colors } from '../../../tokens/colors'
import { ROUTES } from '../../../router/paths'
import { statisticsApi } from '../../../api/statistics.api'
import { getErrorMessage } from '../../../api/errorMessage'
import type { BookingStatistics } from '../../../api/types'

const STATUS_COLOR: Record<string, string> = {
  ACCEPTED: colors.success,
  PENDING: colors.warning,
  REJECTED: colors.danger,
  CANCELLED: colors.muted,
  EXPIRED: colors.muted,
}

export default function AdminBookingStatsPage() {
  const { t } = useTranslation('admin')
  const [stats, setStats] = useState<BookingStatistics | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    statisticsApi.bookings().then(setStats).catch((err) => setError(getErrorMessage(err, t('common.notFoundGeneric'))))
  }, [t])

  if (error) return <p className="text-danger text-sm">{error}</p>
  if (!stats) return <PageLoader />

  const avgStay = stats.totalBookings > 0 ? Math.round(stats.monthly.reduce((s, m) => s + m.count, 0) / stats.monthly.length) : 0
  const statusData = (Object.entries(stats.byStatus) as [string, number][]).map(([status, value]) => ({
    name: t(`status.booking.${status}`),
    value,
    color: STATUS_COLOR[status] ?? colors.muted,
  }))

  const tiles = [
    { label: t('statistics.bookings.tileTotal'), value: stats.totalBookings, color: colors.navy },
    { label: t('statistics.bookings.tileAccepted'), value: stats.byStatus.ACCEPTED, color: colors.success },
    { label: t('statistics.bookings.tilePending'), value: stats.byStatus.PENDING, color: colors.warning },
    { label: t('statistics.bookings.tileAvgStay'), value: avgStay, color: colors.accent },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('statistics.bookings.eyebrow')}
        title={t('statistics.bookings.title')}
        action={
          <Link to={ROUTES.ADMIN.STATS_REVENUE} className="px-4 py-2 text-xs font-semibold border border-navy text-navy rounded-lg hover:bg-navy hover:text-white transition-colors">
            {t('statistics.bookings.goToRevenue')}
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((s) => (
          <StatTile key={s.label} label={s.label} value={s.value} color={s.color} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold text-navy text-sm mb-4">{t('statistics.bookings.monthlyChartTitle')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="count" fill={colors.navy} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold text-navy text-sm mb-4">{t('statistics.bookings.statusBreakdownTitle')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                {statusData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Legend formatter={(val: string) => <span className="text-xs text-slate-600">{val}</span>} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}
