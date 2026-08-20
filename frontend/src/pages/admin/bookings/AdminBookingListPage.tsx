import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageHeader from '../../../components/PageHeader'
import Card from '../../../components/Card'
import Pagination from '../../../components/Pagination'
import { PageLoader } from '../../../components/common/PageLoader'
import Dropdown from '../../../components/Dropdown'
import { SearchInput, AdminTable, StatusBadge, BOOKING_STATUS_CONFIG } from '../../../components/admin'
import { ROUTES } from '../../../router/paths'
import { bookingApi } from '../../../api/booking.api'
import { getErrorMessage } from '../../../api/errorMessage'
import type { Booking, BookingStatus } from '../../../api/types'

const STATUS_DOTS: Record<string, string> = { ALL: 'bg-slate-300', PENDING: 'bg-amber-400', ACCEPTED: 'bg-emerald-400', REJECTED: 'bg-red-400', CANCELLED: 'bg-slate-400', EXPIRED: 'bg-slate-400' }

export default function AdminBookingListPage() {
  const { t, i18n } = useTranslation('admin')
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const PER_PAGE = 10

  useEffect(() => {
    // Bat loading truoc khi goi API refetch theo page/search/status - pattern
    // fetch-with-loading-flag chuan (giong vi du chinh thuc cua React), can
    // tat rule nay vi no coi moi setState dong bo dau effect la sai.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    bookingApi
      .adminList({ page, limit: PER_PAGE, search: search || undefined, status: statusFilter === 'ALL' ? undefined : (statusFilter as BookingStatus) })
      .then((res) => { setBookings(res.items); setTotal(res.total) })
      .catch((err) => setError(getErrorMessage(err, t('common.notFoundGeneric'))))
      .finally(() => setLoading(false))
  }, [page, search, statusFilter, t])

  const statusOptions = [
    { value: 'ALL', label: t('bookings.list.statusAll') },
    ...(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED'] as BookingStatus[]).map((s) => ({ value: s, label: t(`status.booking.${s}`) })),
  ]

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={t('bookings.list.eyebrow')} title={t('bookings.list.title')} subtitle={t('bookings.list.subtitle', { count: total })} />

      <Card>
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder={t('bookings.list.searchPlaceholder')} className="flex-1 max-w-xs" />
          <Dropdown value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1) }} options={statusOptions} statusDots={STATUS_DOTS} size="sm" className="w-40" />
        </div>

        {loading ? (
          <PageLoader fullPage={false} />
        ) : error ? (
          <p className="p-6 text-danger text-sm">{error}</p>
        ) : (
          <>
            <AdminTable
              rowKey={(b: Booking) => b.id}
              rows={bookings}
              columns={[
                { key: 'id', header: t('table.id'), render: (b) => <span className="font-mono text-xs font-semibold text-navy">#{b.id}</span> },
                { key: 'guest', header: t('table.guest'), render: (b) => b.user?.fullName ?? b.user?.email ?? '—' },
                { key: 'room', header: t('table.room'), render: (b) => b.room?.name ?? '—' },
                {
                  key: 'dates',
                  header: t('table.dates'),
                  render: (b) => (
                    <>
                      {new Date(b.checkInDate).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
                      <div className="text-slate-400">→ {new Date(b.checkOutDate).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}</div>
                    </>
                  ),
                },
                { key: 'total', header: t('table.total'), render: (b) => `$${b.totalPrice.toLocaleString()}` },
                { key: 'status', header: t('common.status'), render: (b) => <StatusBadge status={b.status} config={BOOKING_STATUS_CONFIG} /> },
                {
                  key: 'actions',
                  header: t('common.actions'),
                  render: (b) => (
                    <button onClick={() => navigate(ROUTES.ADMIN.BOOKING_DETAIL(b.id))} className="px-2.5 py-1 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap">
                      {t('common.view')}
                    </button>
                  ),
                },
              ]}
            />
            <Pagination page={page} total={total} perPage={PER_PAGE} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
