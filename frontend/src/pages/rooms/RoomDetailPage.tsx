import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageHeader from '../../components/PageHeader'
import AmenityPill from '../../components/AmenityPill'
import StarRating from '../../components/StarRating'
import EmptyState from '../../components/EmptyState'
import ImageLightbox from '../../components/ImageLightbox'
import PriceSummaryCard from '../../components/PriceSummaryCard'
import { PageLoader } from '../../components/common/PageLoader'
import { roomApi } from '../../api/room.api'
import { reviewApi } from '../../api/review.api'
import { getErrorMessage } from '../../api/errorMessage'
import { getAccessToken } from '../../api/axiosClient'
import { ROUTES } from '../../router/paths'
import type { PublicReview, Room } from '../../api/types'

const REVIEWS_PER_PAGE = 10

export default function RoomDetailPage() {
  const { t } = useTranslation(['rooms', 'common'])
  const navigate = useNavigate()
  const { roomId } = useParams<{ roomId: string }>()
  const [searchParams] = useSearchParams()

  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [reviews, setReviews] = useState<PublicReview[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)

  const [activeImage, setActiveImage] = useState<string | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!roomId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setLoadError(null)
    roomApi
      .getPublicById(roomId)
      .then((data) => {
        setRoom(data)
        setActiveImage(data.images?.find((img) => img.isThumbnail)?.imageUrl ?? data.images?.[0]?.imageUrl ?? null)
      })
      .catch((err) => setLoadError(getErrorMessage(err, t('detail.loadError'))))
      .finally(() => setLoading(false))
  }, [roomId, t])

  useEffect(() => {
    if (!roomId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReviewsLoading(true)
    reviewApi
      .listByRoom(roomId, { page: 1, limit: REVIEWS_PER_PAGE })
      .then((res) => setReviews(res.items))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false))
  }, [roomId])

  const carryQueryString = () => {
    const q = new URLSearchParams()
    const checkIn = searchParams.get('checkIn')
    const checkOut = searchParams.get('checkOut')
    const guests = searchParams.get('guests')
    if (checkIn) q.set('checkIn', checkIn)
    if (checkOut) q.set('checkOut', checkOut)
    if (guests) q.set('guests', guests)
    const qs = q.toString()
    return qs ? `?${qs}` : ''
  }

  const handleBook = () => {
    if (!roomId) return
    if (!getAccessToken()) {
      navigate(`${ROUTES.LOGIN}?redirect=${encodeURIComponent(`${ROUTES.ROOM_DETAIL(roomId)}${carryQueryString()}`)}`)
      return
    }
    navigate(`${ROUTES.BOOK_ROOM(roomId)}${carryQueryString()}`)
  }

  if (loading) return <PageLoader />

  if (loadError || !room) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <p className="text-danger text-sm">{loadError ?? t('detail.notFound')}</p>
      </div>
    )
  }

  const amenities = room.amenities ?? []
  const images = room.images ?? []
  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null
  const isAuthenticated = !!getAccessToken()

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 min-h-screen">
      <PageHeader eyebrow={t('detail.eyebrow')} title={room.name} subtitle={room.roomType} showBack />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Gallery */}
          <div className="rounded-2xl overflow-hidden bg-slate-200 h-96 mb-3 cursor-zoom-in" onClick={() => activeImage && setLightboxSrc(activeImage)}>
            {activeImage && <img src={activeImage} alt={room.name} className="w-full h-full object-cover" />}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mb-8 overflow-x-auto">
              {images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(img.imageUrl)}
                  className={`w-20 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                    activeImage === img.imageUrl ? 'border-navy' : 'border-transparent'
                  }`}
                >
                  <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="mb-8">
            <h3 className="font-semibold text-navy mb-2">{t('detail.description')}</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{room.description}</p>
            <p className="text-slate-500 text-sm mt-2">{t('detail.capacity')}: {t('common:roomCard.upToGuests', { count: room.capacity })}</p>
            {room.viewType && (
              <p className="text-slate-500 text-sm mt-1">{t('list.filters.viewType')}: {t(`list.viewTypeLabel.${room.viewType}`)}</p>
            )}
          </div>

          {/* Amenities */}
          {amenities.length > 0 && (
            <div className="mb-8">
              <h3 className="font-semibold text-navy mb-3">{t('detail.amenities')}</h3>
              <div className="flex flex-wrap gap-2">
                {amenities.map((a) => (
                  <AmenityPill key={a.id} size="md">{a.name}</AmenityPill>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="font-semibold text-navy">{t('detail.reviews')}</h3>
              {avgRating !== null && (
                <div className="flex items-center gap-1.5">
                  <StarRating rating={avgRating} size="md" />
                  <span className="text-sm text-slate-500">{avgRating.toFixed(1)}</span>
                </div>
              )}
            </div>

            {reviewsLoading ? (
              <PageLoader fullPage={false} />
            ) : reviews.length === 0 ? (
              <EmptyState icon="✍️" title={t('detail.noReviews')} desc={t('detail.noReviewsDesc')} />
            ) : (
              <div className="flex flex-col gap-4">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-white rounded-xl p-5 border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-navy text-sm">{review.author?.fullName ?? '—'}</span>
                      <StarRating rating={review.rating} />
                    </div>
                    {review.comment && <p className="text-slate-600 text-sm leading-relaxed">{review.comment}</p>}
                    <div className="text-xs text-slate-400 mt-2">
                      {new Date(review.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <PriceSummaryCard
            // nights=1 chi de hien 1 dong gia mau + giu nut Book bam duoc
            // (PriceSummaryCard tu disable onBook khi nights === 0) - trang
            // nay chua co ngay cu the, gia tri that se tinh lai o BookRoomPage.
            pricePerNight={room.pricePerNight}
            nights={1}
            taxRate={0}
            sticky
            onBook={handleBook}
            bookLabel={isAuthenticated ? t('detail.bookThisRoom') : t('detail.loginToBook')}
          />
        </div>
      </div>

      <ImageLightbox src={lightboxSrc} alt={room.name} onClose={() => setLightboxSrc(null)} />
    </div>
  )
}
