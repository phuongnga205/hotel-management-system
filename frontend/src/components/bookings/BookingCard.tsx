import { useEffect, useState } from 'react'
import { Button, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import type { Booking } from '../../api/types'
import { formatCurrency } from '../../utils/formatCurrency'
import { getHoldExpiryMs } from '../../constants/booking'
import HoldCountdown from './HoldCountdown'

interface BookingCardProps {
  booking: Booking
  onEditDates: (booking: Booking) => void
  onCancel: (booking: Booking) => void
  onPay: (booking: Booking) => void
  onReview?: (booking: Booking) => void
}

export function BookingCard({ booking, onEditDates, onCancel, onPay, onReview }: BookingCardProps) {
  const { t } = useTranslation('booking')

  const checkIn = dayjs(booking.checkInDate)
  const checkOut = dayjs(booking.checkOutDate)
  const nights = checkOut.diff(checkIn, 'day')

  const isPast = checkOut.isBefore(dayjs(), 'day')

  const thumbnail = booking.room?.thumbnailUrl || '/placeholder-room.jpg'
  const roomName = booking.room?.name || t('labels.unknownRoom')

  // Han giu cho khong tra ve tu API (hoan toan noi bo BE) - tu suy ra tu
  // createdAt + BOOKING_HOLD_MINUTES (constants/booking.ts, PHAI khop dung
  // hang so backend). Chi co y nghia khi booking dang PENDING.
  const holdExpiresAtMs = getHoldExpiryMs(booking.createdAt)
  const [holdActive, setHoldActive] = useState(
    () => booking.status === 'PENDING' && Date.now() < holdExpiresAtMs,
  )
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHoldActive(booking.status === 'PENDING' && Date.now() < holdExpiresAtMs)
  }, [booking.status, holdExpiresAtMs])

  const hasSuccessPayment = booking.payment?.status === 'SUCCESS'

  // Determine Tag color - map BookingStatus sang mau semantic AntD Tag co
  // san, khong hardcode hex rieng o day.
  let statusColor = 'default'
  let isUnpaid = false

  if (booking.status === 'PENDING') statusColor = 'warning'
  if (booking.status === 'ACCEPTED') {
    statusColor = 'success'
    if (!hasSuccessPayment) {
      isUnpaid = true
    }
  }
  if (booking.status === 'REJECTED' || booking.status === 'CANCELLED' || booking.status === 'EXPIRED') {
    statusColor = 'error'
  }

  // 2 tinh huong hop le de goi .../pay (backend/docs/DANH_SACH_API.md muc 4):
  // 1) PENDING + hold con han -> tra xong tu ACCEPTED.
  // 2) ACCEPTED nhung chua co payment SUCCESS nao -> "tra bu", khong doi
  //    status, khong gioi han boi hold 10 phut.
  const canPay = holdActive || (booking.status === 'ACCEPTED' && !hasSuccessPayment)

  // Chi duoc review sau khi da o xong: ACCEPTED + da thanh toan thanh cong +
  // qua checkOutDate (khop dung logic ReviewsService.create() o BE, xem
  // backend/src/reviews/reviews.service.ts) - FE an nut neu chua du dieu
  // kien de tranh submit roi bi 400, BE van tu kiem tra lai lan cuoi.
  // + !booking.hasReview - moi booking chi duoc review dung 1 lan (unique
  // booking_id o bang reviews), truoc day thieu dieu kien nay nen nut
  // "Write Review" van hien lai sau khi da review xong, bam vao chi an loi
  // 409 ALREADY_REVIEWED kho hieu.
  const canReview = booking.status === 'ACCEPTED' && hasSuccessPayment && isPast && !booking.hasReview

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border flex flex-col md:flex-row overflow-hidden mb-6 relative transition-colors ${
        holdActive ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-100'
      }`}
    >
      {/* Image Section */}
      <div className="w-full md:w-64 h-48 md:h-auto relative shrink-0">
        <img src={thumbnail} alt={roomName} className="w-full h-full object-cover" />
        {isPast && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-black/60 text-white px-3 py-1 rounded text-sm backdrop-blur-sm">{t('labels.pastStay')}</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-navy mb-1">{roomName}</h3>
            <p className="text-sm text-gray-400">
              {t('labels.bookingId')}
              {booking.id}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Tag color={statusColor} className="m-0 rounded-full px-3 py-1 text-sm font-medium border-none flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${statusColor === 'warning' ? 'bg-orange-500' : statusColor === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
              {t(`status.${booking.status}`)}
            </Tag>

            {holdActive && <HoldCountdown expiresAt={holdExpiresAtMs} onExpire={() => setHoldActive(false)} />}

            {/* Payment badge */}
            {isUnpaid && booking.status === 'ACCEPTED' && (
              <Tag color="default" className="m-0 rounded-full px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-500 border-none">
                {t('paymentStatus.UNPAID')}
              </Tag>
            )}
            {!isUnpaid && booking.status === 'ACCEPTED' && (
              <Tag color="success" className="m-0 rounded-full px-3 py-1 text-xs font-semibold border-none flex items-center gap-1 bg-green-50 text-green-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t('paymentStatus.PAID')}
              </Tag>
            )}

            {booking.payment?.status === 'REFUNDED' && (
              <Tag color="default" className="m-0 rounded-full px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-500 border-none">
                {t('paymentStatus.REFUNDED')}
              </Tag>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('labels.checkIn')}</p>
            <p className="font-semibold text-navy">{checkIn.format('MMM D, YYYY')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('labels.checkOut')}</p>
            <p className="font-semibold text-navy">{checkOut.format('MMM D, YYYY')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('labels.duration')}</p>
            <p className="font-semibold text-navy">
              {nights} {nights > 1 ? t('labels.nights') : t('labels.night')}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('labels.total')}</p>
            <p className="font-bold text-navy text-lg">{formatCurrency(Number(booking.totalPrice))}</p>
          </div>
        </div>

        {booking.cancelReason && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            <span className="font-semibold">{t('labels.reason')}: </span>
            {booking.cancelReason}
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto pt-4 border-t border-gray-100 flex flex-wrap gap-3">
          {canPay && (
            <Button type="primary" className="!bg-gold hover:!bg-gold-dark !border-none font-semibold px-6" onClick={() => onPay(booking)}>
              {t('buttons.payNow')} — {formatCurrency(Number(booking.totalPrice))}
            </Button>
          )}

          {booking.status === 'PENDING' && !isPast && (
            <>
              <Button onClick={() => onEditDates(booking)}>{t('buttons.editDates')}</Button>
              <Button danger onClick={() => onCancel(booking)}>
                {t('buttons.cancelBooking')}
              </Button>
            </>
          )}

          {canReview && onReview && (
            <Button onClick={() => onReview(booking)}>{t('buttons.writeReview')}</Button>
          )}

          {/* Da review roi (booking.hasReview) - hien trang thai thay vi lai
              cho bam "Write Review" lan nua (BE chan 409 ALREADY_REVIEWED,
              moi booking chi duoc review dung 1 lan). */}
          {booking.status === 'ACCEPTED' && hasSuccessPayment && isPast && booking.hasReview && (
            <Tag color="default" className="m-0 rounded-full px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-500 border-none flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {t('labels.reviewed')}
            </Tag>
          )}
        </div>
      </div>
    </div>
  )
}
