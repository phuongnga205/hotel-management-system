import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ALL_BOOKINGS } from '../../../data/mock'
import { BookingStatusBadge, RoomTypeBadge, PageHeader, Card } from '../../../components/ui'
import { Breadcrumb, ConfirmModal } from '../../../components/admin'
import { PATHS } from '../../../routes/paths'

export default function AdminBookingDetailPage() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const booking = ALL_BOOKINGS.find((b) => b.id === bookingId)
  const [status, setStatus] = useState(booking?.status)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  if (!booking) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Booking not found.</p>
          <Link to={PATHS.ADMIN.BOOKINGS} className="text-navy font-semibold hover:text-gold">← Back to Bookings</Link>
        </div>
      </div>
    )
  }

  const handleAccept = () => setStatus('ACCEPTED')
  const handleReject = () => { setStatus('REJECTED'); setShowRejectModal(false) }

  return (
    <div className="space-y-5 max-w-4xl">
      <Breadcrumb items={[{ label: 'Bookings', to: PATHS.ADMIN.BOOKINGS }, { label: '#' + booking.id }]} />
      <PageHeader eyebrow="Operations 🚧" title={'Booking #' + booking.id} action={<BookingStatusBadge status={status ?? booking.status} />} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Booking info */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden flex">
            <div className="relative w-44 shrink-0 bg-slate-200">
              <img src={booking.roomImage} alt={booking.roomName} className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3"><RoomTypeBadge type={booking.roomType} /></div>
            </div>
            <div className="p-5">
              <h3 className="font-bold text-navy text-base">{booking.roomName}</h3>
              <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                {[
                  { label: 'Check-in', val: new Date(booking.checkIn).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) },
                  { label: 'Check-out', val: new Date(booking.checkOut).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) },
                  { label: 'Duration', val: `${booking.nights} nights` },
                  { label: 'Total', val: `$${booking.totalPrice.toLocaleString()}` },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <div className="text-xs text-slate-400 mb-0.5">{label}</div>
                    <div className="font-semibold text-navy text-sm">{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-navy text-sm uppercase tracking-wide mb-3">Guest Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: 'Name', val: booking.guestName },
                { label: 'Email', val: booking.guestEmail },
                { label: 'Phone', val: booking.guestPhone },
                { label: 'Booked At', val: new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div className="text-xs text-slate-400 mb-0.5">{label}</div>
                  <div className="font-medium text-navy">{val}</div>
                </div>
              ))}
            </div>
            {booking.note && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-400 mb-1">Special Request</div>
                <p className="text-sm text-slate-600 italic">"{booking.note}"</p>
              </div>
            )}
          </Card>

          {/* Accept / Reject */}
          {(status === 'PENDING') && (
            <div className="flex gap-3">
              <button onClick={handleAccept} className="flex-1 py-2.5 text-sm font-bold text-white rounded-lg bg-emerald-500 hover:bg-emerald-600 transition-colors">
                ✓ Accept Booking
              </button>
              <button onClick={() => setShowRejectModal(true)} className="flex-1 py-2.5 text-sm font-bold text-white rounded-lg bg-red-500 hover:bg-red-600 transition-colors">
                ✕ Reject Booking
              </button>
            </div>
          )}
          {status === 'ACCEPTED' && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-emerald-700 text-sm">Booking has been accepted.</p>
            </div>
          )}
          {status === 'REJECTED' && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">Booking has been rejected.</p>
            </div>
          )}
        </div>

        {/* Price summary */}
        <Card className="p-5 h-fit">
          <h3 className="font-semibold text-navy text-sm uppercase tracking-wide mb-4">Price Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">${booking.pricePerNight} × {booking.nights} nights</span>
              <span className="font-semibold text-navy">${(booking.pricePerNight * booking.nights).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex justify-between pt-3 mt-3 border-t border-slate-100">
            <span className="font-bold text-navy">Total</span>
            <span className="font-bold text-navy text-lg">${booking.totalPrice.toLocaleString()}</span>
          </div>
          <div className="mt-3">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${booking.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {booking.paymentStatus === 'PAID' ? '✓ Paid' : 'Unpaid'}
            </span>
          </div>
        </Card>
      </div>

      <ConfirmModal
        open={showRejectModal}
        title="Reject Booking"
        danger={false}
        confirmLabel="Reject"
        onConfirm={handleReject}
        onCancel={() => setShowRejectModal(false)}
      >
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Reason (optional)</label>
          <textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-navy focus:outline-none focus:ring-1 focus:ring-navy/30 resize-none" placeholder="Explain why the booking is being rejected..." />
        </div>
      </ConfirmModal>
    </div>
  )
}
