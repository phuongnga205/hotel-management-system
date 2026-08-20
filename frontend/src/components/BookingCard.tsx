import type { Booking } from '../data/mock'
import { BookingStatusBadge, RoomTypeBadge } from './ui'

interface BookingCardProps {
  booking: Booking
  onView: () => void
  onCancel?: () => void
  onPay?: () => void
}

export default function BookingCard({ booking, onView, onCancel, onPay }: BookingCardProps) {
  const checkIn = new Date(booking.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const checkOut = new Date(booking.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const canCancel = (booking.status === 'PENDING' || booking.status === 'ACCEPTED') && onCancel
  const canPay = booking.status === 'ACCEPTED' && booking.paymentStatus === 'UNPAID' && onPay

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col md:flex-row">
      <div className="relative w-full md:w-44 h-44 md:h-auto shrink-0 bg-slate-200">
        <img src={booking.roomImage} alt={booking.roomName} className="w-full h-full object-cover" />
        <div className="absolute top-3 left-3">
          <RoomTypeBadge type={booking.roomType} />
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="font-semibold text-navy text-base leading-tight">{booking.roomName}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Booking #{booking.id}</p>
            </div>
            <BookingStatusBadge status={booking.status} />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm mb-4">
            {[
              { label: 'Check-in', value: checkIn },
              { label: 'Check-out', value: checkOut },
              { label: 'Duration', value: `${booking.nights} night${booking.nights !== 1 ? 's' : ''}` },
              { label: 'Total', value: `$${booking.totalPrice.toLocaleString()}` },
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
            View Details
          </button>
          {canPay && (
            <button
              onClick={onPay}
              className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition-opacity hover:opacity-90"
              style={{ background: '#C9A84C' }}
            >
              Pay Now
            </button>
          )}
          {canCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
