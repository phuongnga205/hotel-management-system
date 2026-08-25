import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import dayjs from 'dayjs'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import FieldLabel from '../../components/FieldLabel'
import inputBase from '../../components/inputBase'
import DatePicker from '../../components/Calendar'
import Dropdown from '../../components/Dropdown'
import PriceSummaryCard from '../../components/PriceSummaryCard'
import AmenityPill from '../../components/AmenityPill'
import { PageLoader } from '../../components/common/PageLoader'
import { roomApi } from '../../api/room.api'
import { bookingApi } from '../../api/booking.api'
import { getErrorMessage, getErrorStatusCode } from '../../api/errorMessage'
import { HTTP_STATUS } from '../../constants/http'
import { ROUTES } from '../../router/paths'
import type { Room } from '../../api/types'

// Chi cho dat tu hom nay tro di - khong cho chon ngay qua khu trong qua khu.
// So sanh chuoi 'YYYY-MM-DD' truc tiep (dung thu tu lexicographic = thu tu
// thoi gian voi dinh dang nay, khong can parse Date).
const today = () => dayjs().format('YYYY-MM-DD')

export default function BookRoomPage() {
  const { t } = useTranslation('rooms')
  const navigate = useNavigate()
  const { roomId } = useParams<{ roomId: string }>()
  const [searchParams] = useSearchParams()
  const [todayYmd] = useState(today)

  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Bo qua gia tri prefill tu query string neu la ngay trong qua khu (vd link
  // cu/bookmark) - de trong cho user tu chon lai, khong bao gio hien san 1
  // ngay khong dat duoc.
  const [checkInDate, setCheckInDate] = useState(() => {
    const q = searchParams.get('checkIn') ?? ''
    return q && q >= todayYmd ? q : ''
  })
  const [checkOutDate, setCheckOutDate] = useState(() => {
    const q = searchParams.get('checkOut') ?? ''
    const ci = searchParams.get('checkIn') ?? ''
    return q && ci && q > ci && ci >= todayYmd ? q : ''
  })
  const [guests, setGuests] = useState(searchParams.get('guests') ?? '1')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!roomId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    roomApi
      .getPublicById(roomId)
      .then(setRoom)
      .catch((err) => setLoadError(getErrorMessage(err, t('detail.loadError'))))
      .finally(() => setLoading(false))
  }, [roomId, t])

  if (loading) return <PageLoader />

  if (loadError || !room) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <p className="text-danger text-sm">{loadError ?? t('detail.notFound')}</p>
      </div>
    )
  }

  const nights = checkInDate && checkOutDate ? Math.max(0, dayjs(checkOutDate).diff(dayjs(checkInDate), 'day')) : 0
  const guestsNum = Number(guests) || 0
  const exceedsCapacity = guestsNum > room.capacity
  const canSubmit = !!checkInDate && !!checkOutDate && nights > 0 && guestsNum >= 1 && !exceedsCapacity

  const guestOptions = Array.from({ length: room.capacity }, (_, i) => ({
    value: String(i + 1),
    label: t('book.guestOption', { count: i + 1 }),
  }))

  const handleSubmit = async () => {
    if (!roomId || !canSubmit) {
      if (!checkInDate || !checkOutDate) toast.error(t('book.datesRequired'))
      return
    }
    try {
      setSubmitting(true)
      await bookingApi.create({
        roomId,
        checkInDate,
        checkOutDate,
        guests: guestsNum,
        note: note || undefined,
      })
      toast.success(t('book.createSuccess'))
      navigate(ROUTES.BOOKINGS)
    } catch (err) {
      const isConflict = getErrorStatusCode(err) === HTTP_STATUS.CONFLICT
      toast.error(isConflict ? t('book.conflictError') : getErrorMessage(err, t('book.createError')))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 min-h-screen">
      <PageHeader eyebrow={t('book.eyebrow')} title={`${t('book.title')} — ${room.name}`} showBack />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="p-6 lg:col-span-2 mb-8">
          {/* Room details - giu nguyen y ngu canh, tranh nguoi dung phai quay
              lai RoomDetailPage de xem lai anh/mo ta/tien nghi khi dang dat phong. */}
          <div className="flex gap-4 mb-6 pb-6 border-b border-slate-100">
            {room.images?.[0] && (
              <div className="w-28 h-28 rounded-xl overflow-hidden shrink-0 bg-slate-200">
                <img src={room.images[0].imageUrl} alt={room.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-navy mb-1">{room.name}</h3>
              {room.description && (
                <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">{room.description}</p>
              )}
              <p className="text-slate-500 text-sm mt-1">
                {t('detail.capacity')}: {t('common:roomCard.upToGuests', { count: room.capacity })}
              </p>
              {room.viewType && (
                <p className="text-slate-500 text-sm mt-1">
                  {t('list.filters.viewType')}: {t(`list.viewTypeLabel.${room.viewType}`)}
                </p>
              )}
              {(room.amenities?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {room.amenities!.map((a) => (
                    <AmenityPill key={a.id} size="sm">{a.name}</AmenityPill>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <FieldLabel>{t('book.checkInDate')}</FieldLabel>
              <DatePicker value={checkInDate} onChange={setCheckInDate} minDate={todayYmd} rangeStart={checkInDate} rangeEnd={checkOutDate} />
            </div>
            <div>
              <FieldLabel>{t('book.checkOutDate')}</FieldLabel>
              <DatePicker value={checkOutDate} onChange={setCheckOutDate} minDate={checkInDate || todayYmd} rangeStart={checkInDate} rangeEnd={checkOutDate} />
            </div>
          </div>

          <div className="mb-4">
            <FieldLabel>{t('book.guests')}</FieldLabel>
            <Dropdown value={guests} onChange={setGuests} options={guestOptions} />
            {exceedsCapacity && (
              <p className="text-xs text-danger mt-1.5">{t('book.guestsExceedCapacity', { capacity: room.capacity })}</p>
            )}
          </div>

          <div>
            <FieldLabel optional>{t('book.note')}</FieldLabel>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('book.notePlaceholder')}
              rows={4}
              className={inputBase}
            />
          </div>
        </Card>

        <div>
          <PriceSummaryCard
            pricePerNight={room.pricePerNight}
            nights={nights}
            guests={guestsNum || 1}
            taxRate={0}
            sticky
            loading={submitting}
            onBook={handleSubmit}
            bookLabel={t('book.submit')}
            meta={[{ label: t('book.summaryGuests'), value: String(guestsNum || '—') }]}
          />
        </div>
      </div>
    </div>
  )
}
