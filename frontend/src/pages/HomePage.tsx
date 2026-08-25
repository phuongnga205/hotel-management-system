import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { RoomGridCard, RoomCardSkeleton } from '../components/RoomCard'
import StarRating from '../components/StarRating'
import DateRangeBar from '../components/DateRangeBar'
import SectionHeader from '../components/SectionHeader'
import { PageLoader } from '../components/common/PageLoader'
import { ROUTES } from '../router/paths'
import { roomApi } from '../api/room.api'
import { reviewApi } from '../api/review.api'
import { colors } from '../tokens/colors'
import { useAuth } from '../hooks/useAuth'
import type { PublicReview, Room } from '../api/types'

const FEATURED_ROOM_COUNT = 6
// So review lay cho carousel "Guest Stories" - GET /reviews (cong khai,
// toan he thong, moi nhat truoc) thay vi truoc day phai fan-out goi
// GET /rooms/:id/reviews cho vai phong mau roi tu gop lai.
const REVIEWS_TO_SHOW = 9
const REVIEWS_PER_SLIDE = 3

function initials(name: string | null): string {
  if (!name) return '?'
  return name.trim().charAt(0).toUpperCase()
}

export default function HomePage() {
  const { t } = useTranslation(['home', 'common'])
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState('2')

  const [rooms, setRooms] = useState<Room[]>([])
  const [roomsTotal, setRoomsTotal] = useState(0)
  const [roomsLoading, setRoomsLoading] = useState(true)

  const [reviews, setReviews] = useState<PublicReview[]>([])
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
      })
      .catch(() => setRooms([]))
      .finally(() => setRoomsLoading(false))

    setReviewsLoading(true)
    reviewApi
      .listAll({ page: 1, limit: REVIEWS_TO_SHOW })
      .then((res) => setReviews(res.items))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false))
  }, [])

  const visibleReviews = reviews.slice(reviewIdx, reviewIdx + REVIEWS_PER_SLIDE)
  const canPrev = reviewIdx > 0
  const canNext = reviewIdx + REVIEWS_PER_SLIDE < reviews.length
  const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : null

  // Admin dang "Back to site" xem lai giao dien khach - cho xem het (khong
  // che HomePage), nhung moi hanh dong dan toi luong dat phong deu vo hieu +
  // bao cho biet ly do, thay vi lam nhu binh thuong roi lai bi AdminGuard/
  // roomApi chan giua chung khong ro rang.
  const notifyAdminPreview = () => toast.info(t('common:adminPreview.bookingDisabled'))

  const handleSearch = () => {
    if (isAdmin) { notifyAdminPreview(); return }
    const q = new URLSearchParams()
    if (checkIn) q.set('checkIn', checkIn)
    if (checkOut) q.set('checkOut', checkOut)
    if (guests) q.set('guests', guests)
    navigate(`${ROUTES.ROOMS}?${q.toString()}`)
  }

  const handleRoomsLinkClick = (e: React.MouseEvent) => {
    if (!isAdmin) return
    e.preventDefault()
    notifyAdminPreview()
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
              <Link
                to={ROUTES.ROOMS}
                onClick={handleRoomsLinkClick}
                className={`text-navy text-sm font-semibold border-b border-navy pb-0.5 hover:text-gold hover:border-gold transition-colors ${isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
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
                onView={() => (isAdmin ? notifyAdminPreview() : navigate(ROUTES.ROOM_DETAIL(room.id)))}
                onBook={() => (isAdmin ? notifyAdminPreview() : navigate(ROUTES.BOOK_ROOM(room.id)))}
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
                  {review.author?.avatarUrl ? (
                    <img src={review.author.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-navy text-white flex items-center justify-center font-semibold shrink-0">
                      {initials(review.author?.fullName ?? null)}
                    </div>
                  )}
                  <div className="font-semibold text-navy text-sm">{review.author?.fullName ?? '—'}</div>
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
          <Link
            to={ROUTES.ROOMS}
            onClick={handleRoomsLinkClick}
            className={`inline-block px-8 py-3 rounded-xl font-semibold text-navy text-sm bg-gold transition-all hover:opacity-90 ${isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {t('home:cta.action')}
          </Link>
        </div>
      </section>
    </div>
  )
}
