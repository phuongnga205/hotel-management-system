import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import dayjs from 'dayjs'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import DetailGrid from '../../components/DetailGrid'
import PaymentMethodSelector from '../../components/bookings/PaymentMethodSelector'
import { PageLoader } from '../../components/common/PageLoader'
import { bookingApi } from '../../api/booking.api'
import { getErrorMessage, getErrorStatusCode } from '../../api/errorMessage'
import { HTTP_STATUS } from '../../constants/http'
import { formatCurrency } from '../../utils/formatCurrency'
import { ROUTES } from '../../router/paths'
import type { Booking, PaymentMethod } from '../../api/types'

export function BookingPaymentPage() {
  const { t } = useTranslation('booking')
  const navigate = useNavigate()
  const { bookingId } = useParams<{ bookingId: string }>()

  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!bookingId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setLoadError(null)
    bookingApi
      .getById(bookingId)
      .then(setBooking)
      .catch((err) => setLoadError(getErrorMessage(err, t('payment.fetchError'))))
      .finally(() => setLoading(false))
  }, [bookingId, t])

  const handleSubmit = async () => {
    if (!bookingId || !method) return
    try {
      setSubmitting(true)
      await bookingApi.pay(bookingId, { method })
      toast.success(t('payment.paySuccess'))
      navigate(ROUTES.BOOKINGS)
    } catch (err) {
      const isConflict = getErrorStatusCode(err) === HTTP_STATUS.CONFLICT
      toast.error(isConflict ? t('payment.conflictError') : getErrorMessage(err, t('payment.payError')))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageLoader />

  if (loadError || !booking) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <p className="text-danger text-sm">{loadError ?? t('payment.notFound')}</p>
      </div>
    )
  }

  const roomName = booking.room?.name ?? t('labels.unknownRoom')

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 min-h-screen">
      <PageHeader eyebrow={t('payment.eyebrow')} title={t('payment.title')} showBack />

      <Card className="p-6 mb-6">
        <h3 className="font-semibold text-navy mb-4">{roomName}</h3>
        <DetailGrid
          cols={2}
          items={[
            { label: t('labels.checkIn'), value: dayjs(booking.checkInDate).format('MMM D, YYYY') },
            { label: t('labels.checkOut'), value: dayjs(booking.checkOutDate).format('MMM D, YYYY') },
            { label: t('payment.summaryGuests'), value: booking.guests },
            { label: t('labels.total'), value: <span className="text-lg font-bold text-navy">{formatCurrency(Number(booking.totalPrice))}</span> },
          ]}
        />
      </Card>

      <Card className="p-6 mb-6">
        <h3 className="font-semibold text-navy mb-4">{t('payment.methodLabel')}</h3>
        <PaymentMethodSelector value={method} onChange={setMethod} disabled={submitting} />
      </Card>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!method || submitting}
        className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-navy transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
      >
        {submitting ? t('payment.processing') : `${t('payment.submit')} — ${formatCurrency(Number(booking.totalPrice))}`}
      </button>
    </div>
  )
}
