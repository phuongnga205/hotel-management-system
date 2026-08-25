import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import StarRating from '../../components/StarRating'
import EmptyState from '../../components/EmptyState'
import Pagination from '../../components/Pagination'
import { PageLoader } from '../../components/common/PageLoader'
import { reviewApi } from '../../api/review.api'
import { getErrorMessage } from '../../api/errorMessage'
import { ROUTES } from '../../router/paths'
import type { Review } from '../../api/types'

const PER_PAGE = 10

export function MyReviewsPage() {
  const { t } = useTranslation('booking')
  const navigate = useNavigate()

  const [page, setPage] = useState(1)
  const [reviews, setReviews] = useState<Review[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    reviewApi
      .listMine({ page, limit: PER_PAGE })
      .then((res) => {
        setReviews(res.items)
        setTotal(res.total)
      })
      .catch((err) => toast.error(getErrorMessage(err, t('myReviews.fetchError'))))
      .finally(() => setLoading(false))
  }, [page, t])

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 min-h-screen">
      <PageHeader eyebrow={t('myAccount')} title={t('myReviews.title')} subtitle={t('myReviews.subtitle')} />

      {loading && reviews.length === 0 ? (
        <PageLoader fullPage={false} />
      ) : reviews.length === 0 ? (
        <EmptyState icon="⭐" title={t('myReviews.empty')} desc={t('myReviews.emptyDesc')} />
      ) : (
        <div className={`flex flex-col gap-4 transition-opacity ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          {reviews.map((review) => {
            const roomName = review.room?.name ?? t('labels.unknownRoom')
            return (
              <Card key={review.id} className="p-6">
                <div className="flex items-start gap-4">
                  {review.room?.thumbnailUrl && (
                    <img src={review.room.thumbnailUrl} alt={roomName} className="w-20 h-20 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <button
                        type="button"
                        onClick={() => review.room && navigate(ROUTES.ROOM_DETAIL(review.room.id))}
                        className="font-semibold text-navy hover:text-gold transition-colors text-left"
                      >
                        {roomName}
                      </button>
                      <StarRating rating={review.rating} />
                    </div>
                    {review.comment && <p className="text-slate-600 text-sm leading-relaxed mt-2">{review.comment}</p>}
                    <div className="text-xs text-slate-400 mt-3">
                      {new Date(review.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
          <Pagination page={page} total={total} perPage={PER_PAGE} onChange={setPage} />
        </div>
      )}
    </div>
  )
}
