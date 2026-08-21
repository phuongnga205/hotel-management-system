import { useTranslation } from 'react-i18next'
import type { Booking } from '../api/types'
import BookingStatusBadge from './BookingStatusBadge'
import { colors } from '../tokens/colors'

interface BookingCardProps {
  booking: Booking
  onView: () => void
  onCancel?: () => void
  onPay?: () => void
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)))
}

export default function BookingCard({ booking, onView, onCancel, onPay }: BookingCardProps) {
  const { t, i18n } = useTranslation('common')
  const nights = nightsBetween(booking.checkInDate, booking.checkOutDate)
  const dateFmt = (iso: string) => new Date(iso).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' })

  const canCancel = (booking.status === 'PENDING' || booking.status === 'ACCEPTED') && onCancel
  const canPay = booking.status === 'ACCEPTED' && booking.payment?.status !== 'SUCCESS' && onPay

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col md:flex-row">
      <div className="relative w-full md:w-44 h-44 md:h-auto shrink-0 bg-slate-200">
        {booking.room?.thumbnailUrl && (
          <img src={booking.room.thumbnailUrl} alt={booking.room.name} className="w-full h-full object-cover" />
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="font-semibold text-navy text-base leading-tight">{booking.room?.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{t('bookingCard.idLabel', { id: booking.id })}</p>
            </div>
            <BookingStatusBadge status={booking.status} />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm mb-4">
            {[
              { label: t('bookingCard.checkIn'), value: dateFmt(booking.checkInDate) },
              { label: t('bookingCard.checkOut'), value: dateFmt(booking.checkOutDate) },
              { label: t('bookingCard.duration'), value: t('bookingCard.nights', { count: nights }) },
              { label: t('bookingCard.total'), value: `$${booking.totalPrice.toLocaleString()}` },
            ].map(({ label, value }) => (
              <div key={label}>
                <span className="text-xs text-slate-400">{label}: </span>
                <span className="font-medium text-navy">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onView}
            className="px-4 py-1.5 text-xs font-semibold text-navy border border-navy/30 rounded-lg hover:bg-navy hover:text-white transition-colors"
          >
            {t('bookingCard.viewDetails')}
          </button>
          {canPay && (
            <button
              onClick={onPay}
              className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition-opacity hover:opacity-90"
              style={{ background: colors.gold }}
            >
              {t('bookingCard.payNow')}
            </button>
          )}
          {canCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              {t('bookingCard.cancel')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
