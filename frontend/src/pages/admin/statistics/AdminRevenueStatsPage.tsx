import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import PageHeader from '../../../components/PageHeader'
import Card from '../../../components/Card'
import { PageLoader } from '../../../components/common/PageLoader'
import { StatTile } from '../../../components/admin'
import { colors } from '../../../tokens/colors'
import { ROUTES } from '../../../router/paths'
import { statisticsApi } from '../../../api/statistics.api'
import { getErrorMessage } from '../../../api/errorMessage'
import type { RevenueStatistics } from '../../../api/types'

export default function AdminRevenueStatsPage() {
  const { t } = useTranslation('admin')
  const [stats, setStats] = useState<RevenueStatistics | null>(null)
  const [totalBookings, setTotalBookings] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([statisticsApi.revenue(), statisticsApi.bookings()])
      .then(([rs, bs]) => { setStats(rs); setTotalBookings(bs.totalBookings) })
      .catch((err) => setError(getErrorMessage(err, t('common.notFoundGeneric'))))
  }, [t])

  if (error) return <p className="text-danger text-sm">{error}</p>
  if (!stats) return <PageLoader />

  const avgMonthly = stats.monthly.length > 0 ? Math.round(stats.totalRevenue / stats.monthly.length) : 0
  const bestMonth = stats.monthly.reduce((a, b) => (a.revenue > b.revenue ? a : b), stats.monthly[0])

  const tiles = [
    { label: t('statistics.revenue.tileTotal'), value: `$${(stats.totalRevenue / 1000).toFixed(0)}k`, color: colors.navy },
    { label: t('statistics.revenue.tileAvgMonthly'), value: `$${(avgMonthly / 1000).toFixed(0)}k`, color: colors.gold },
    { label: t('statistics.revenue.tileBestMonth'), value: bestMonth?.month ?? '—', color: colors.success },
    { label: t('statistics.revenue.tileTotalBookings'), value: totalBookings, color: colors.accent },
  ]

  const maxMonthlyRevenue = Math.max(1, ...stats.monthly.map((m) => m.revenue))

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('statistics.revenue.eyebrow')}
        title={t('statistics.revenue.title')}
        action={
          <Link to={ROUTES.ADMIN.STATS_BOOKINGS} className="px-4 py-2 text-xs font-semibold border border-navy text-navy rounded-lg hover:bg-navy hover:text-white transition-colors">
            {t('statistics.revenue.goToBookings')}
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
          <h3 className="font-semibold text-navy text-sm mb-4">{t('statistics.revenue.trendChartTitle')}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={stats.monthly}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.navy} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={colors.navy} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v / 1000}k`} />
              <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, t('statistics.revenue.tileTotal')]} />
              <Area type="monotone" dataKey="revenue" stroke={colors.navy} strokeWidth={2} fill="url(#revGrad)" dot={{ r: 4, fill: colors.gold }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-navy text-sm mb-4">{t('statistics.revenue.byRoomTypeChartTitle')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.byRoomType}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="roomType" tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v / 1000}k`} />
              <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, t('statistics.revenue.tileTotal')]} />
              <Bar dataKey="revenue" fill={colors.gold} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-navy text-sm mb-4">{t('statistics.revenue.monthlyBreakdownTitle')}</h3>
          <div className="space-y-2">
            {stats.monthly.map((d) => (
              <div key={d.month} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-8 shrink-0">{d.month}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full bg-navy" style={{ width: `${(d.revenue / maxMonthlyRevenue) * 100}%` }} />
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
