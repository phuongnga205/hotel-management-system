import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import dayjs from 'dayjs'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import FieldLabel from '../../components/FieldLabel'
import inputBase from '../../components/inputBase'
import StarRating from '../../components/StarRating'
import { PageLoader } from '../../components/common/PageLoader'
import { bookingApi } from '../../api/booking.api'
import { reviewApi } from '../../api/review.api'
import { getErrorMessage, getErrorStatusCode } from '../../api/errorMessage'
import { HTTP_STATUS } from '../../constants/http'
import { ROUTES } from '../../router/paths'
import type { Booking } from '../../api/types'

const COMMENT_MAX_LENGTH = 2000

export function BookingReviewPage() {
  const { t } = useTranslation('booking')
  const navigate = useNavigate()
  const { bookingId } = useParams<{ bookingId: string }>()

  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!bookingId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    bookingApi
      .getById(bookingId)
      .then(setBooking)
      .catch((err) => setLoadError(getErrorMessage(err, t('review.fetchError'))))
      .finally(() => setLoading(false))
  }, [bookingId, t])

  const handleSubmit = async () => {
    if (!bookingId || rating < 1) return
    try {
      setSubmitting(true)
      await reviewApi.create(bookingId, rating, comment.trim() || undefined)
      toast.success(t('review.createSuccess'))
      navigate(ROUTES.BOOKINGS)
    } catch (err) {
      const status = getErrorStatusCode(err)
      if (status === HTTP_STATUS.CONFLICT) {
        toast.error(t('review.alreadyReviewed'))
      } else if (status === HTTP_STATUS.BAD_REQUEST) {
        toast.error(t('review.notEligible'))
      } else {
        toast.error(getErrorMessage(err, t('review.createError')))
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageLoader />

  if (loadError || !booking) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <p className="text-danger text-sm">{loadError ?? t('review.notFound')}</p>
      </div>
    )
  }

  // Chi duoc review sau khi da o xong: ACCEPTED + da thanh toan thanh cong +
  // qua checkOutDate - khop dung logic BE (backend/src/reviews/reviews.service.ts).
  const isEligible =
    booking.status === 'ACCEPTED' && booking.payment?.status === 'SUCCESS' && dayjs(booking.checkOutDate).isBefore(dayjs())

  if (!isEligible) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <p className="text-slate-500 text-sm">{t('review.notEligible')}</p>
      </div>
    )
  }

  const roomName = booking.room?.name ?? t('labels.unknownRoom')

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 min-h-screen">
      <PageHeader eyebrow={t('review.eyebrow')} title={t('review.title')} subtitle={roomName} showBack />

      <Card className="p-6">
        <div className="mb-6">
          <FieldLabel>{t('review.ratingLabel')}</FieldLabel>
          <StarRating rating={rating} size="lg" onChange={setRating} />
        </div>

        <div>
          <FieldLabel optional>{t('review.commentLabel')}</FieldLabel>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX_LENGTH))}
            placeholder={t('review.commentPlaceholder')}
            rows={5}
            className={inputBase}
          />
          <p className="text-xs text-slate-400 text-right mt-1">{comment.length}/{COMMENT_MAX_LENGTH}</p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={rating < 1 || submitting}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-navy transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 mt-2"
        >
          {submitting ? t('review.processing') : t('review.submit')}
        </button>
      </Card>
    </div>
  )
}
