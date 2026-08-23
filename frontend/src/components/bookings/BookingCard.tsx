import { Button, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import type { Booking } from '../../api/types'
import { formatCurrency } from '../../utils/formatCurrency'

interface BookingCardProps {
  booking: Booking
  onEditDates: (booking: Booking) => void
  onCancel: (booking: Booking) => void
  onPay: (booking: Booking) => void
}

export function BookingCard({ booking, onEditDates, onCancel, onPay }: BookingCardProps) {
  const { t } = useTranslation()
  
  const checkIn = dayjs(booking.checkInDate)
  const checkOut = dayjs(booking.checkOutDate)
  const nights = checkOut.diff(checkIn, 'day')

  const isPast = checkOut.isBefore(dayjs(), 'day')

  // Image fallback
  const thumbnail = booking.room?.thumbnailUrl || '/placeholder-room.jpg'

  // Determine Tag Color
  let statusColor = 'default'
  let isUnpaid = false

  if (booking.status === 'PENDING') statusColor = 'warning'
  if (booking.status === 'ACCEPTED') {
    statusColor = 'success'
    if (booking.payment?.status !== 'SUCCESS') {
      isUnpaid = true
    }
  }
  if (booking.status === 'REJECTED' || booking.status === 'CANCELLED' || booking.status === 'EXPIRED') {
    statusColor = 'error'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row overflow-hidden mb-6 relative">
      {/* Image Section */}
      <div className="w-full md:w-64 h-48 md:h-auto relative shrink-0">
        <img 
          src={thumbnail} 
          alt={booking.room?.name || 'Room'} 
          className="w-full h-full object-cover"
        />
        {isPast && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-black/60 text-white px-3 py-1 rounded text-sm backdrop-blur-sm">
              {t('booking.labels.pastStay', 'Past Stay')}
            </span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-secondary mb-1">
              {booking.room?.name || 'Unknown Room'}
            </h3>
            <p className="text-sm text-gray-400">
              {t('booking.labels.bookingId', 'Booking #')}{booking.id}
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <Tag color={statusColor} className="m-0 rounded-full px-3 py-1 text-sm font-medium border-none flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${statusColor === 'warning' ? 'bg-orange-500' : statusColor === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
              {t(`booking.status.${booking.status}`, booking.status)}
            </Tag>
            
            {/* Payment badge */}
            {isUnpaid && booking.status === 'ACCEPTED' && (
              <Tag color="default" className="m-0 rounded-full px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-500 border-none">
                {t('booking.paymentStatus.UNPAID', 'UNPAID')}
              </Tag>
            )}
            {!isUnpaid && booking.status === 'ACCEPTED' && (
              <Tag color="success" className="m-0 rounded-full px-3 py-1 text-xs font-semibold border-none flex items-center gap-1 bg-green-50 text-green-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t('booking.paymentStatus.PAID', 'Payment Complete')}
              </Tag>
            )}
            
            {booking.payment?.status === 'REFUNDED' && (
              <Tag color="default" className="m-0 rounded-full px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-500 border-none">
                {t('booking.paymentStatus.REFUNDED', 'REFUNDED')}
              </Tag>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('booking.labels.checkIn', 'Check-in')}</p>
            <p className="font-semibold text-secondary">{checkIn.format('MMM D, YYYY')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('booking.labels.checkOut', 'Check-out')}</p>
            <p className="font-semibold text-secondary">{checkOut.format('MMM D, YYYY')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('booking.labels.duration', 'Duration')}</p>
            <p className="font-semibold text-secondary">{nights} {nights > 1 ? t('booking.labels.nights', 'nights') : t('booking.labels.night', 'night')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('booking.labels.total', 'Total')}</p>
            <p className="font-bold text-secondary text-lg">{formatCurrency(Number(booking.totalPrice))}</p>
          </div>
        </div>
        
        {booking.cancelReason && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            <span className="font-semibold">{t('booking.labels.reason', 'Reason')}: </span>
            {booking.cancelReason}
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto pt-4 border-t border-gray-100 flex gap-3">
          {booking.status === 'ACCEPTED' && isUnpaid && !isPast && (
            <Button 
              type="primary" 
              className="bg-[#D4B254] hover:bg-[#C2A04A] border-none font-semibold px-6"
              onClick={() => onPay(booking)}
            >
              {t('booking.buttons.payNow', 'Pay Now')} — {formatCurrency(Number(booking.totalPrice))}
            </Button>
          )}

          {booking.status === 'PENDING' && !isPast && (
            <>
              <Button onClick={() => onEditDates(booking)}>
                {t('booking.buttons.editDates', 'Edit Dates')}
              </Button>
              <Button danger onClick={() => onCancel(booking)}>
                {t('booking.buttons.cancelBooking', 'Cancel Booking')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
