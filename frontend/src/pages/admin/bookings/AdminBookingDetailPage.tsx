import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import PageHeader from '../../../components/PageHeader'
import Card from '../../../components/Card'
import { PageLoader } from '../../../components/common/PageLoader'
import PaymentBadge from '../../../components/PaymentBadge'
import { Breadcrumb, ConfirmModal, StatusBadge, BOOKING_STATUS_CONFIG } from '../../../components/admin'
import { ROUTES } from '../../../router/paths'
import { bookingApi } from '../../../api/booking.api'
import { getErrorMessage } from '../../../api/errorMessage'
import type { Booking } from '../../../api/types'

function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)))
}

export default function AdminBookingDetailPage() {
  const { t, i18n } = useTranslation('admin')
  const { bookingId } = useParams()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const load = () => {
    if (!bookingId) return
    setLoading(true)
    bookingApi.adminGetById(bookingId).then(setBooking).catch(() => setBooking(null)).finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-with-loading-flag pattern, xem AdminBookingListPage.tsx
  useEffect(load, [bookingId])

  if (loading) return <PageLoader />

  if (!booking) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">{t('bookings.detail.notFound')}</p>
          <Link to={ROUTES.ADMIN.BOOKINGS} className="text-navy font-semibold hover:text-gold">{t('bookings.detail.backToList')}</Link>
        </div>
      </div>
    )
  }

  const nights = nightsBetween(booking.checkInDate, booking.checkOutDate)
  const dateFmt = (iso: string) => new Date(iso).toLocaleDateString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

  const handleAccept = async () => {
    try {
      await bookingApi.accept(booking.id)
      load()
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.notFoundGeneric')))
    }
  }

  const handleReject = async () => {
    try {
      await bookingApi.reject(booking.id, { cancelReason: rejectReason || undefined })
      setShowRejectModal(false)
      load()
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.notFoundGeneric')))
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <Breadcrumb items={[{ label: t('bookings.list.title'), to: ROUTES.ADMIN.BOOKINGS }, { label: '#' + booking.id }]} />
      <PageHeader eyebrow={t('bookings.list.eyebrow')} title={t('bookings.detail.titleWithId', { id: booking.id })} action={<StatusBadge status={booking.status} config={BOOKING_STATUS_CONFIG} />} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden flex">
            {booking.room?.thumbnailUrl && (
              <div className="relative w-44 shrink-0 bg-slate-200">
                <img src={booking.room.thumbnailUrl} alt={booking.room.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-5">
              <h3 className="font-bold text-navy text-base">{booking.room?.name}</h3>
              <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                {[
                  { label: t('table.checkIn'), val: dateFmt(booking.checkInDate) },
                  { label: t('table.checkOut'), val: dateFmt(booking.checkOutDate) },
                  { label: t('bookings.detail.fieldDuration'), val: t('bookings.detail.nightsCount', { count: nights }) },
                  { label: t('table.total'), val: `$${booking.totalPrice.toLocaleString()}` },
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
            <h3 className="font-semibold text-navy text-sm uppercase tracking-wide mb-3">{t('bookings.detail.guestInfoTitle')}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: t('bookings.detail.fieldName'), val: booking.user?.fullName ?? '—' },
                { label: t('bookings.detail.fieldEmail'), val: booking.user?.email ?? '—' },
                { label: t('bookings.detail.fieldPhone'), val: booking.user?.phone ?? '—' },
                { label: t('bookings.detail.fieldBookedAt'), val: new Date(booking.createdAt).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' }) },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div className="text-xs text-slate-400 mb-0.5">{label}</div>
                  <div className="font-medium text-navy">{val}</div>
                </div>
              ))}
            </div>
            {booking.note && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-400 mb-1">{t('bookings.detail.noteLabel')}</div>
                <p className="text-sm text-slate-600 italic">"{booking.note}"</p>
              </div>
            )}
          </Card>

          {booking.status === 'PENDING' && (
            <div className="flex gap-3">
              <button onClick={handleAccept} className="flex-1 py-2.5 text-sm font-bold text-white rounded-lg bg-emerald-500 hover:bg-emerald-600 transition-colors">
                {t('bookings.detail.acceptAction')}
              </button>
              <button onClick={() => setShowRejectModal(true)} className="flex-1 py-2.5 text-sm font-bold text-white rounded-lg bg-red-500 hover:bg-red-600 transition-colors">
                {t('bookings.detail.rejectAction')}
              </button>
            </div>
          )}
          {booking.status === 'ACCEPTED' && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-emerald-700 text-sm">{t('bookings.detail.acceptedNotice')}</p>
            </div>
          )}
          {booking.status === 'REJECTED' && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{booking.cancelReason || t('bookings.detail.rejectedNotice')}</p>
            </div>
          )}
          {booking.status === 'CANCELLED' && (
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg p-3">
              <p className="text-slate-600 text-sm">{booking.cancelReason || t('bookings.detail.cancelledNotice')}</p>
            </div>
          )}
          {booking.status === 'EXPIRED' && (
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg p-3">
              <p className="text-slate-600 text-sm">{t('bookings.detail.expiredNotice')}</p>
            </div>
          )}
        </div>

        <Card className="p-5 h-fit">
          <h3 className="font-semibold text-navy text-sm uppercase tracking-wide mb-4">{t('bookings.detail.priceSummaryTitle')}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">{t('bookings.detail.pricePerNightLine', { price: booking.pricePerNight, nights })}</span>
              <span className="font-semibold text-navy">${(booking.pricePerNight * nights).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex justify-between pt-3 mt-3 border-t border-slate-100">
            <span className="font-bold text-navy">{t('table.total')}</span>
            <span className="font-bold text-navy text-lg">${booking.totalPrice.toLocaleString()}</span>
          </div>
          <div className="mt-3">
            <PaymentBadge status={booking.payment?.status ?? null} />
          </div>
        </Card>
      </div>

      <ConfirmModal
        open={showRejectModal}
        title={t('bookings.detail.rejectModalTitle')}
        danger={false}
        confirmLabel={t('bookings.detail.rejectModalConfirm')}
        onConfirm={handleReject}
        onCancel={() => setShowRejectModal(false)}
      >
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t('bookings.detail.rejectReasonLabel')}</label>
          <textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-navy focus:outline-none focus:ring-1 focus:ring-navy/30 resize-none" placeholder={t('bookings.detail.rejectReasonPlaceholder')} />
        </div>
      </ConfirmModal>
    </div>
  )
}
