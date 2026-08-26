import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import PageHeader from '../../../components/PageHeader'
import Card from '../../../components/Card'
import { PageLoader } from '../../../components/common/PageLoader'
import { StatTile, StatisticsPeriodControls } from '../../../components/admin'
import { colors } from '../../../tokens/colors'
import { ROUTES } from '../../../router/paths'
import { statisticsApi } from '../../../api/statistics.api'
import { getErrorMessage } from '../../../api/errorMessage'
import { formatBucketLabel, bestBookingBucket } from '../../../utils/statisticsBucket'
import { downloadStatisticsFile } from '../../../utils/statisticsExport'
import type { RevenueBookingsStatistics, StatisticsQuery } from '../../../api/types'
import { STATISTICS_PERIOD } from '../../../constants/statistics'

export default function AdminBookingStatsPage() {
  const { t } = useTranslation('admin')
  const [query, setQuery] = useState<StatisticsQuery>({ period: STATISTICS_PERIOD.MONTH, year: new Date().getFullYear() })
  const [stats, setStats] = useState<RevenueBookingsStatistics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null)
    setStats(null)
    statisticsApi
      .getRevenueAndBookings(query)
      .then((result) => { if (active) setStats(result) })
      .catch((err) => { if (active) setError(getErrorMessage(err, t('common.notFoundGeneric'))) })
    return () => { active = false }
  }, [query, t])

  if (error) return (
    <div className="space-y-5">
      <StatisticsPeriodControls query={query} onChange={setQuery} />
      <p className="text-danger text-sm">{error}</p>
    </div>
  )
  if (!stats) return <PageLoader />

  const chartData = stats.buckets.map((b) => ({ label: formatBucketLabel(b.label, stats.period), count: b.bookingCount }))
  const bestBucket = bestBookingBucket(stats.buckets)
  const avgPerBucket = stats.buckets.length > 0 ? Math.round(stats.totalBookings / stats.buckets.length) : 0

  const tiles = [
    { label: t('statistics.bookings.tileTotal'), value: stats.totalBookings, color: colors.navy },
    { label: t('statistics.bookings.tileBestPeriod'), value: bestBucket ? formatBucketLabel(bestBucket.label, stats.period) : '—', color: colors.gold },
    { label: t('statistics.bookings.tileAvgPerPeriod'), value: avgPerBucket, color: colors.accent },
  ]

  const handleExport = async () => {
    try {
      setExporting(true)
      const blob = await statisticsApi.exportRevenueAndBookings(query)
      downloadStatisticsFile(blob, query)
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.notFoundGeneric')))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('statistics.bookings.eyebrow')}
        title={t('statistics.bookings.title')}
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {exporting ? t('statistics.controls.exporting') : t('statistics.controls.exportExcel')}
            </button>
            <Link to={ROUTES.ADMIN.STATS_REVENUE} className="px-4 py-2 text-xs font-semibold border border-navy text-navy rounded-lg hover:bg-navy hover:text-white transition-colors">
              {t('statistics.bookings.goToRevenue')}
            </Link>
          </div>
        }
      />

      <StatisticsPeriodControls query={query} onChange={setQuery} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tiles.map((s) => (
          <StatTile key={s.label} label={s.label} value={s.value} color={s.color} />
        ))}
      </div>

      <Card className="p-5">
        <h3 className="font-semibold text-navy text-sm mb-4">{t('statistics.bookings.chartTitle')}</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill={colors.navy} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
