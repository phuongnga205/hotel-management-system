import { useEffect, useState } from 'react'
import { Typography, message, Spin, Pagination } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { bookingApi } from '../../api/booking.api'
import type { Booking } from '../../api/types'
import { BookingCard } from '../../components/bookings/BookingCard'
import { EditBookingModal } from '../../components/bookings/EditBookingModal'
import { CancelBookingModal } from '../../components/bookings/CancelBookingModal'

const { Title, Paragraph } = Typography

export function BookingHistoryPage() {
  const { t } = useTranslation('booking')
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [editBooking, setEditBooking] = useState<Booking | null>(null)
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [counts, setCounts] = useState<Record<string, number>>({})

  const fetchCounts = async () => {
    try {
      const statuses = ['PENDING', 'ACCEPTED', 'CANCELLED']
      const results = await Promise.all(
        statuses.map(s => bookingApi.listMine({ status: (s as any), limit: 1 }))
      )
      const newCounts: Record<string, number> = {}
      let total = 0
      statuses.forEach((s, idx) => {
        newCounts[s] = results[idx].total
        total += results[idx].total
      })
      newCounts['all'] = total
      setCounts(newCounts)
    } catch (error) {
      console.error('Failed to fetch counts', error)
    }
  }

  const fetchBookings = async (status: string, page: number) => {
    try {
      setLoading(true)
      const res = await bookingApi.listMine({ 
        status: status === 'all' ? undefined : (status as any),
        page,
        limit: 5
      })
      let fetchedBookings = res.items
      let total = res.total
      
      // If we are on 'all' tab, we ensure it only counts valid statuses (though our mock only generates valid ones now)
      if (status === 'all') {
        fetchedBookings = fetchedBookings.filter(b => ['PENDING', 'ACCEPTED', 'CANCELLED'].includes(b.status))
        // The total is already handled accurately by the mock, but for safety in real app:
      }
      setBookings(fetchedBookings)
      setTotalItems(total)
    } catch (error) {
      console.error(error)
      message.error(t('booking.messages.fetchError', 'Failed to load bookings'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings(activeTab, currentPage)
    fetchCounts()
  }, [activeTab, currentPage])

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab])

  const handleEditConfirm = async (checkIn: string, checkOut: string) => {
    if (!editBooking) return
    try {
      setActionLoading(true)
      await bookingApi.updateBookingDates(editBooking.id, { checkInDate: checkIn, checkOutDate: checkOut })
      message.success(t('booking.messages.updateSuccess', 'Booking dates updated successfully'))
      setEditBooking(null)
      fetchBookings(activeTab, currentPage)
      fetchCounts()
    } catch (error: any) {
      if (error.response?.status === 409) {
        message.error('Room not available for these dates')
      } else {
        message.error(t('booking.messages.updateError', 'Failed to update dates'))
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelConfirm = async (_reason: string) => {
    if (!cancelBooking) return
    try {
      setActionLoading(true)
      await bookingApi.cancel(cancelBooking.id)
      message.success(t('booking.messages.cancelSuccess', 'Booking cancelled successfully'))
      setCancelBooking(null)
      fetchBookings(activeTab, currentPage)
      fetchCounts()
    } catch (error) {
      message.error(t('booking.messages.cancelError', 'Failed to cancel booking'))
    } finally {
      setActionLoading(false)
    }
  }

  const handlePay = (booking: Booking) => {
    navigate(`/bookings/${booking.id}/payment`)
  }

  const tabItems = [
    { key: 'all', label: t('tabs.all', 'All Bookings') },
    { key: 'PENDING', label: t('tabs.pending', 'Pending') },
    { key: 'ACCEPTED', label: t('tabs.accepted', 'Accepted') },
    { key: 'CANCELLED', label: t('tabs.cancelled', 'Cancelled') },
  ]

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 min-h-screen">
      <div className="mb-8">
        <div className="text-xs font-bold tracking-widest text-primary/80 uppercase mb-2">
          {t('booking.myAccount', 'MY ACCOUNT')}
        </div>
        <Title level={2} className="!mb-1 text-secondary">
          {t('booking.title', 'Booking History')}
        </Title>
        <Paragraph className="text-gray-500">
          {t('booking.subtitle', 'Manage and track all your reservations in one place.')}
        </Paragraph>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-1 inline-flex overflow-x-auto max-w-full mb-6">
        {tabItems.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ease-in-out whitespace-nowrap ${
                isActive 
                  ? 'bg-[#0f2744] text-white' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors duration-300 ${
                isActive 
                  ? 'bg-white/20 text-white' 
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {counts[tab.key] ?? '-'}
              </span>
            </button>
          )
        })}
      </div>

      <div className={`transition-opacity duration-300 min-h-[400px] ${loading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
        {loading && bookings.length === 0 ? (
          <div className="py-20 flex justify-center"><Spin size="large" /></div>
        ) : bookings.length === 0 ? (
          <div className="text-center p-12 bg-gray-50 rounded-lg text-gray-500">
            {t('booking.messages.noBookings', 'No bookings found.')}
          </div>
        ) : (
          <div className="flex flex-col">
            {bookings.map(booking => (
              <BookingCard 
                key={booking.id}
                booking={booking}
                onEditDates={setEditBooking}
                onCancel={setCancelBooking}
                onPay={handlePay}
              />
            ))}
            {totalItems > 5 && (
              <div className="flex justify-center mt-6 mb-8">
                <Pagination 
                  current={currentPage} 
                  pageSize={5} 
                  total={totalItems} 
                  onChange={(page) => setCurrentPage(page)}
                  showSizeChanger={false}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {editBooking && (
        <EditBookingModal
          visible={!!editBooking}
          currentCheckIn={editBooking.checkInDate}
          currentCheckOut={editBooking.checkOutDate}
          onClose={() => setEditBooking(null)}
          onConfirm={handleEditConfirm}
          loading={actionLoading}
        />
      )}

      {cancelBooking && (
        <CancelBookingModal
          visible={!!cancelBooking}
          onClose={() => setCancelBooking(null)}
          onConfirm={handleCancelConfirm}
          loading={actionLoading}
        />
      )}
    </div>
  )
}
