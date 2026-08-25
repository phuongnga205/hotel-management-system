import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import PageHeader from '../../../components/PageHeader'
import Card from '../../../components/Card'
import Dropdown from '../../../components/Dropdown'
import Pagination from '../../../components/Pagination'
import { PageLoader } from '../../../components/common/PageLoader'
import { StatTile, AdminTable, PaymentDetailModal, StatisticsPeriodControls } from '../../../components/admin'
import PaymentBadge from '../../../components/PaymentBadge'
import { colors } from '../../../tokens/colors'
import { ROUTES } from '../../../router/paths'
import { statisticsApi } from '../../../api/statistics.api'
import { paymentApi } from '../../../api/payment.api'
import { getErrorMessage } from '../../../api/errorMessage'
import { formatBucketLabel, bestRevenueBucket } from '../../../utils/statisticsBucket'
import type { AdminPayment, PaymentMethod, PaymentStatus, RevenueBookingsStatistics, StatisticsQuery } from '../../../api/types'

const TRANSACTIONS_PER_PAGE = 10

const PAYMENT_STATUS_DOTS: Record<string, string> = { ALL: 'bg-slate-300', PENDING: 'bg-amber-400', SUCCESS: 'bg-emerald-400', FAILED: 'bg-red-400', REFUNDED: 'bg-slate-400' }
const PAYMENT_STATUSES: PaymentStatus[] = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED']
const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'VNPAY']

export default function AdminRevenueStatsPage() {
  const { t } = useTranslation('admin')
  const [query, setQuery] = useState<StatisticsQuery>({ period: 'MONTH', year: new Date().getFullYear() })
  const [stats, setStats] = useState<RevenueBookingsStatistics | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState('ALL')
  const [methodFilter, setMethodFilter] = useState('ALL')
  const [txPage, setTxPage] = useState(1)
  const [transactions, setTransactions] = useState<AdminPayment[]>([])
  const [txTotal, setTxTotal] = useState(0)
  const [txLoading, setTxLoading] = useState(true)
  const [txError, setTxError] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<AdminPayment | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStats(null)
    statisticsApi
      .getRevenueAndBookings(query)
      .then(setStats)
      .catch((err) => setError(getErrorMessage(err, t('common.notFoundGeneric'))))
  }, [query, t])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTxLoading(true)
    paymentApi
      .adminList({
        page: txPage,
        limit: TRANSACTIONS_PER_PAGE,
        status: statusFilter === 'ALL' ? undefined : (statusFilter as PaymentStatus),
        method: methodFilter === 'ALL' ? undefined : (methodFilter as PaymentMethod),
      })
      .then((res) => { setTransactions(res.items); setTxTotal(res.total) })
      .catch((err) => setTxError(getErrorMessage(err, t('common.notFoundGeneric'))))
      .finally(() => setTxLoading(false))
  }, [txPage, statusFilter, methodFilter, t])

  if (error) return <p className="text-danger text-sm">{error}</p>
  if (!stats) return <PageLoader />

  const chartData = stats.buckets.map((b) => ({ label: formatBucketLabel(b.label, stats.period), revenue: Number(b.revenue) }))
  const bestBucket = bestRevenueBucket(stats.buckets)
  const totalRevenue = Number(stats.totalRevenue)
  const avgPerBucket = stats.buckets.length > 0 ? Math.round(totalRevenue / stats.buckets.length) : 0
  const maxBucketRevenue = Math.max(1, ...stats.buckets.map((b) => Number(b.revenue)))

  const tiles = [
    { label: t('statistics.revenue.tileTotal'), value: `$${(totalRevenue / 1000).toFixed(0)}k`, color: colors.navy },
    { label: t('statistics.revenue.tileAvgPerPeriod'), value: `$${(avgPerBucket / 1000).toFixed(0)}k`, color: colors.gold },
    { label: t('statistics.revenue.tileBestPeriod'), value: bestBucket ? formatBucketLabel(bestBucket.label, stats.period) : '—', color: colors.success },
    { label: t('statistics.revenue.tileTotalBookings'), value: stats.totalBookings, color: colors.accent },
  ]

  const statusOptions = [
    { value: 'ALL', label: t('statistics.revenue.statusAll') },
    ...PAYMENT_STATUSES.map((s) => ({ value: s, label: t(`status.payment.${s}`) })),
  ]
  const methodOptions = [
    { value: 'ALL', label: t('statistics.revenue.methodAll') },
    ...PAYMENT_METHODS.map((m) => ({ value: m, label: t(`status.paymentMethod.${m}`) })),
  ]

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

      <StatisticsPeriodControls query={query} onChange={setQuery} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((s) => (
          <StatTile key={s.label} label={s.label} value={s.value} color={s.color} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold text-navy text-sm mb-4">{t('statistics.revenue.trendChartTitle')}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.navy} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={colors.navy} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v / 1000}k`} />
              <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, t('statistics.revenue.tileTotal')]} />
              <Area type="monotone" dataKey="revenue" stroke={colors.navy} strokeWidth={2} fill="url(#revGrad)" dot={{ r: 4, fill: colors.gold }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold text-navy text-sm mb-4">{t('statistics.revenue.breakdownTitle')}</h3>
          <div className="space-y-2">
            {stats.buckets.map((b) => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-14 shrink-0">{formatBucketLabel(b.label, stats.period)}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full bg-navy" style={{ width: `${(Number(b.revenue) / maxBucketRevenue) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-navy w-16 text-right">${(Number(b.revenue) / 1000).toFixed(0)}k</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-100">
          <h3 className="font-semibold text-navy text-sm">{t('statistics.revenue.transactionsTitle')}</h3>
          <div className="flex items-center gap-3">
            <Dropdown
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setTxPage(1) }}
              options={statusOptions}
              statusDots={PAYMENT_STATUS_DOTS}
              size="sm"
              className="w-40"
            />
            <Dropdown
              value={methodFilter}
              onChange={(v) => { setMethodFilter(v); setTxPage(1) }}
              options={methodOptions}
              size="sm"
              className="w-44"
            />
          </div>
        </div>

        {txLoading ? (
          <PageLoader fullPage={false} />
        ) : txError ? (
          <p className="p-6 text-danger text-sm">{txError}</p>
        ) : transactions.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">{t('statistics.revenue.noTransactions')}</p>
        ) : (
          <>
            <AdminTable
              rowKey={(p: AdminPayment) => p.id}
              rows={transactions}
              onRowClick={setSelectedPayment}
              columns={[
                { key: 'id', header: t('table.id'), render: (p) => <span className="font-mono text-xs font-semibold text-navy">#{p.bookingId}</span> },
                { key: 'guest', header: t('table.guest'), render: (p) => p.booking?.guestName ?? p.booking?.guestEmail ?? '—' },
                { key: 'room', header: t('table.room'), render: (p) => p.booking?.roomName ?? '—' },
                { key: 'amount', header: t('table.amount'), render: (p) => `$${Number(p.amount).toLocaleString()}` },
                { key: 'status', header: t('common.status'), render: (p) => <PaymentBadge status={p.status} /> },
              ]}
            />
            <Pagination page={txPage} total={txTotal} perPage={TRANSACTIONS_PER_PAGE} onChange={setTxPage} />
          </>
        )}
      </Card>

      <PaymentDetailModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />
    </div>
  )
}
