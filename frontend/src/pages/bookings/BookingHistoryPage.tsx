import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import PageHeader from '../../components/PageHeader'
import TabBar from '../../components/TabBar'
import Pagination from '../../components/Pagination'
import EmptyState from '../../components/EmptyState'
import { PageLoader } from '../../components/common/PageLoader'
import { BookingCard } from '../../components/bookings/BookingCard'
import { EditBookingModal } from '../../components/bookings/EditBookingModal'
import { CancelBookingModal } from '../../components/bookings/CancelBookingModal'
import { bookingApi } from '../../api/booking.api'
import { getErrorMessage, getErrorStatusCode } from '../../api/errorMessage'
import { HTTP_STATUS } from '../../constants/http'
import { ROUTES } from '../../router/paths'
import type { Booking, BookingStatus } from '../../api/types'

const PER_PAGE = 5

type TabKey = 'all' | BookingStatus

const STATUS_TABS: BookingStatus[] = ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED']

export function BookingHistoryPage() {
  const { t } = useTranslation('booking')
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [page, setPage] = useState(1)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState<Partial<Record<TabKey, number>>>({})
  // Bump sau moi thao tac thay doi du lieu (sua/huy booking) de trigger lai
  // ca danh sach lan so dem tren tab, thay vi tu goi lai 2 ham fetch thu
  // cong rai rac o tung handler.
  const [refreshKey, setRefreshKey] = useState(0)

  const [editBooking, setEditBooking] = useState<Booking | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    bookingApi
      .listMine({ status: activeTab === 'all' ? undefined : activeTab, page, limit: PER_PAGE })
      .then((res) => {
        setBookings(res.items)
        setTotal(res.total)
      })
      .catch((err) => toast.error(getErrorMessage(err, t('messages.fetchError'))))
      .finally(() => setLoading(false))
  }, [activeTab, page, refreshKey, t])

  useEffect(() => {
    let cancelled = false
    Promise.all(STATUS_TABS.map((status) => bookingApi.listMine({ status, page: 1, limit: 1 })))
      .then((results) => {
        if (cancelled) return
        const next: Partial<Record<TabKey, number>> = {}
        let allTotal = 0
        STATUS_TABS.forEach((status, i) => {
          next[status] = results[i].total
          allTotal += results[i].total
        })
        next.all = allTotal
        setCounts(next)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key)
    setPage(1)
  }

  const handleEditConfirm = async (checkIn: string, checkOut: string) => {
    if (!editBooking) return
    try {
      setActionLoading(true)
      await bookingApi.updateBookingDates(editBooking.id, { checkInDate: checkIn, checkOutDate: checkOut })
      toast.success(t('messages.updateSuccess'))
      setEditBooking(null)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      const isConflict = getErrorStatusCode(err) === HTTP_STATUS.CONFLICT
      toast.error(isConflict ? t('messages.dateConflict') : getErrorMessage(err, t('messages.updateError')))
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelConfirm = async (reason: string) => {
    if (!cancelTarget) return
    try {
      setActionLoading(true)
      // cancelReason la optional (CancelBookingDto o BE) - chi gui khi user
      // co nhap, khong gui object rong.
      await bookingApi.cancel(cancelTarget.id, reason ? { cancelReason: reason } : undefined)
      toast.success(t('messages.cancelSuccess'))
      setCancelTarget(null)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      toast.error(getErrorMessage(err, t('messages.cancelError')))
    } finally {
      setActionLoading(false)
    }
  }

  // /bookings/:id/payment chua duoc dung route (BookingPaymentPage chua
  // duoc dung) - xem frontend/docs/CAU_TRUC_ROUTE.md muc B, ghi chu
  // "BookingPaymentPage". Giu dieu huong nay vi day dung thiet ke da chot,
  // chi con thieu trang dich (gap da duoc ghi nhan rieng).
  const handlePay = (booking: Booking) => {
    navigate(`${ROUTES.BOOKINGS}/${booking.id}/payment`)
  }

  const tabs = [
    { key: 'all' as const, label: t('tabs.all'), count: counts.all },
    ...STATUS_TABS.map((status) => ({
      key: status,
      label: t(`tabs.${status.toLowerCase()}`),
      count: counts[status],
    })),
  ]

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 min-h-screen">
      <PageHeader eyebrow={t('myAccount')} title={t('title')} subtitle={t('subtitle')} />

      <TabBar tabs={tabs} active={activeTab} onChange={handleTabChange} className="mb-6" />

      {loading && bookings.length === 0 ? (
        <PageLoader fullPage={false} />
      ) : bookings.length === 0 ? (
        <EmptyState icon="🗓️" title={t('messages.noBookings')} desc={t('messages.noBookingsDesc')} />
      ) : (
        <div className={`flex flex-col transition-opacity ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} onEditDates={setEditBooking} onCancel={setCancelTarget} onPay={handlePay} />
          ))}
          <Pagination page={page} total={total} perPage={PER_PAGE} onChange={setPage} />
        </div>
      )}

      {editBooking && (
        <EditBookingModal
          visible
          currentCheckIn={editBooking.checkInDate}
          currentCheckOut={editBooking.checkOutDate}
          onClose={() => setEditBooking(null)}
          onConfirm={handleEditConfirm}
          loading={actionLoading}
        />
      )}

      {cancelTarget && (
        <CancelBookingModal visible onClose={() => setCancelTarget(null)} onConfirm={handleCancelConfirm} loading={actionLoading} />
      )}
    </div>
  )
}
