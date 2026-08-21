import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RoomGridCard, RoomCardSkeleton } from '../components/RoomCard'
import StarRating from '../components/StarRating'
import DateRangeBar from '../components/DateRangeBar'
import SectionHeader from '../components/SectionHeader'
import { PageLoader } from '../components/common/PageLoader'
import { ROUTES } from '../router/paths'
import { roomApi } from '../api/room.api'
import { reviewApi } from '../api/review.api'
import { colors } from '../tokens/colors'
import type { Review, Room } from '../api/types'

const FEATURED_ROOM_COUNT = 6
// So phong lay review de gop lai lam carousel "Guest Stories" - khong co
// endpoint public liet ke review toan he thong (xem backend/docs), nen gop
// tu vai phong noi bat thay vi bia dat 1 API chua duoc tai lieu hoa.
const REVIEW_SOURCE_ROOM_COUNT = 3
const REVIEWS_PER_SLIDE = 3

function initials(name: string | null): string {
  if (!name) return '?'
  return name.trim().charAt(0).toUpperCase()
}

export default function HomePage() {
  const { t } = useTranslation(['home', 'common'])
  const navigate = useNavigate()
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState('2')

  const [rooms, setRooms] = useState<Room[]>([])
  const [roomsTotal, setRoomsTotal] = useState(0)
  const [roomsLoading, setRoomsLoading] = useState(true)

  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [reviewIdx, setReviewIdx] = useState(0)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-with-loading-flag pattern, xem AdminBookingListPage.tsx
    setRoomsLoading(true)
    roomApi
      .listPublic({ page: 1, limit: FEATURED_ROOM_COUNT })
      .then((res) => {
        setRooms(res.items)
        setRoomsTotal(res.total)

        setReviewsLoading(true)
        const sourceRooms = res.items.slice(0, REVIEW_SOURCE_ROOM_COUNT)
        Promise.all(sourceRooms.map((r) => reviewApi.listByRoom(r.id, { page: 1, limit: REVIEWS_PER_SLIDE }).catch(() => ({ items: [] as Review[], total: 0, page: 1, limit: 0, totalPages: 0 }))))
          .then((results) => {
            const merged = results
              .flatMap((r) => r.items)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            setReviews(merged)
          })
          .finally(() => setReviewsLoading(false))
      })
      .catch(() => {
        setRooms([])
        setReviews([])
        setReviewsLoading(false)
      })
      .finally(() => setRoomsLoading(false))
  }, [])

  const visibleReviews = reviews.slice(reviewIdx, reviewIdx + REVIEWS_PER_SLIDE)
  const canPrev = reviewIdx > 0
  const canNext = reviewIdx + REVIEWS_PER_SLIDE < reviews.length
  const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : null

  const handleSearch = () => {
    const q = new URLSearchParams()
    if (checkIn) q.set('checkIn', checkIn)
    if (checkOut) q.set('checkOut', checkOut)
    if (guests) q.set('guests', guests)
    navigate(`${ROUTES.ROOMS}?${q.toString()}`)
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative h-[88vh] min-h-[560px] flex items-center justify-center overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1664174728312-47aad71055c5?w=1920&h=1080&fit=crop&auto=format"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${colors.navy}8c 0%, ${colors.navy}bf 100%)` }} />

        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 text-center">
          <p className="text-gold tracking-[0.25em] uppercase text-sm font-semibold mb-3">{t('home:hero.eyebrow')}</p>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            {t('home:hero.titleLine1')}<br />{t('home:hero.titleLine2')}
          </h1>
          <p className="text-white/75 text-lg mb-10 max-w-xl mx-auto">{t('home:hero.subtitle')}</p>

          <DateRangeBar
            checkIn={checkIn}
            checkOut={checkOut}
            guests={guests}
            onCheckInChange={setCheckIn}
            onCheckOutChange={setCheckOut}
            onGuestsChange={setGuests}
            onSearch={handleSearch}
            className="max-w-3xl mx-auto shadow-2xl"
          />
        </div>
      </section>

      {/* Stats bar */}
      <div className="bg-navy py-6">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: roomsLoading ? '—' : String(roomsTotal), label: t('home:stats.rooms') },
            { value: avgRating ? `${avgRating}★` : '—', label: t('home:stats.rating') },
            { value: '15+', label: t('home:stats.years') },
            { value: '50k+', label: t('home:stats.guests') },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-2xl font-bold text-gold">{value}</div>
              <div className="text-white/60 text-xs mt-0.5 uppercase tracking-wide">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Rooms */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="mb-8">
          <SectionHeader
            eyebrow={t('home:featuredRooms.eyebrow')}
            title={t('home:featuredRooms.title')}
            action={
              <Link to={ROUTES.ROOMS} className="text-navy text-sm font-semibold border-b border-navy pb-0.5 hover:text-gold hover:border-gold transition-colors">
                {t('home:featuredRooms.viewAll')}
              </Link>
            }
          />
        </div>

        {roomsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => <RoomCardSkeleton key={i} />)}
          </div>
        ) : rooms.length === 0 ? (
          <p className="text-slate-500 text-center py-10">{t('home:featuredRooms.empty')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <RoomGridCard
                key={room.id}
                room={room}
                onView={() => navigate(ROUTES.ROOM_DETAIL(room.id))}
                onBook={() => navigate(ROUTES.BOOK_ROOM(room.id))}
              />
            ))}
          </div>
        )}
      </section>

      {/* Why Choose Us */}
      <section className="bg-surface py-14">
        <div className="max-w-5xl mx-auto px-4">
          <div className="mb-10">
            <SectionHeader
              eyebrow={t('home:whyUs.eyebrow')}
              title={t('home:whyUs.title')}
              center={true}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '★', title: t('home:whyUs.serviceTitle'), desc: t('home:whyUs.serviceDesc') },
              { icon: '%', title: t('home:whyUs.rateTitle'), desc: t('home:whyUs.rateDesc') },
              { icon: '→', title: t('home:whyUs.transferTitle'), desc: t('home:whyUs.transferDesc') },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 text-center shadow-sm border border-slate-100">
                <div className="text-3xl mb-3 font-bold text-navy">{icon}</div>
                <h3 className="font-bold text-navy mb-2 text-base">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Carousel */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="mb-8">
          <SectionHeader
            eyebrow={t('home:reviews.eyebrow')}
            title={t('home:reviews.title')}
            action={
              reviews.length > REVIEWS_PER_SLIDE ? (
                <div className="flex gap-2">
                  <button onClick={() => setReviewIdx(Math.max(0, reviewIdx - REVIEWS_PER_SLIDE))} disabled={!canPrev} className="w-9 h-9 rounded-full border border-navy/20 flex items-center justify-center text-navy hover:bg-navy hover:text-white transition-colors disabled:opacity-30">‹</button>
                  <button onClick={() => setReviewIdx(Math.min(reviews.length - REVIEWS_PER_SLIDE, reviewIdx + REVIEWS_PER_SLIDE))} disabled={!canNext} className="w-9 h-9 rounded-full border border-navy/20 flex items-center justify-center text-navy hover:bg-navy hover:text-white transition-colors disabled:opacity-30">›</button>
                </div>
              ) : undefined
            }
          />
        </div>

        {reviewsLoading ? (
          <PageLoader fullPage={false} />
        ) : visibleReviews.length === 0 ? (
          <p className="text-slate-500 text-center py-10">{t('home:reviews.empty')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {visibleReviews.map((review) => (
              <div key={review.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-navy text-white flex items-center justify-center font-semibold shrink-0">
                    {initials(review.user?.fullName ?? null)}
                  </div>
                  <div>
                    <div className="font-semibold text-navy text-sm">{review.user?.fullName ?? '—'}</div>
                    <div className="text-xs text-slate-400">{review.room?.name}</div>
                  </div>
                </div>
                <StarRating rating={review.rating} />
                {review.comment && <p className="text-slate-600 text-sm leading-relaxed mt-3 flex-1">"{review.comment}"</p>}
                <div className="text-xs text-slate-400 mt-4">
                  {new Date(review.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA Banner */}
      <section className="relative overflow-hidden py-16 my-8 mx-4 rounded-3xl" style={{ background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navyLight} 100%)` }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(circle at 80% 50%, ${colors.gold} 0%, transparent 60%)` }} />
        <div className="relative text-center px-4">
          <p className="text-gold text-xs font-semibold uppercase tracking-widest mb-2">{t('home:cta.eyebrow')}</p>
          <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{t('home:cta.title')}</h2>
          <p className="text-white/70 mb-8 text-base max-w-md mx-auto">{t('home:cta.subtitle')}</p>
          <Link to={ROUTES.ROOMS} className="inline-block px-8 py-3 rounded-xl font-semibold text-navy text-sm bg-gold transition-all hover:opacity-90">
            {t('home:cta.action')}
          </Link>
        </div>
      </section>
    </div>
  )
}
