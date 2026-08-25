import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PageHeader from '../../../components/PageHeader'
import Card from '../../../components/Card'
import Pagination from '../../../components/Pagination'
import StarRating from '../../../components/StarRating'
import Dropdown from '../../../components/Dropdown'
import { PageLoader } from '../../../components/common/PageLoader'
import { ConfirmModal, StatusBadge, REVIEW_STATUS_CONFIG } from '../../../components/admin'
import { reviewApi } from '../../../api/review.api'
import { getErrorMessage } from '../../../api/errorMessage'
import type { Review, SortOrder } from '../../../api/types'

const PER_PAGE = 10

export default function AdminReviewListPage() {
  const { t, i18n } = useTranslation('admin')
  const [page, setPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC')
  const [reviews, setReviews] = useState<Review[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    reviewApi
      .adminList({ page, limit: PER_PAGE, sortOrder })
      .then((res) => { setReviews(res.items); setTotal(res.total) })
      .catch((err) => setError(getErrorMessage(err, t('common.notFoundGeneric'))))
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-with-loading-flag pattern, xem AdminBookingListPage.tsx
  useEffect(load, [page, sortOrder, t])

  const sortOptions = [
    { value: 'DESC', label: t('common.sortNewest') },
    { value: 'ASC', label: t('common.sortOldest') },
  ]

  const handleDelete = async (id: string) => {
    await reviewApi.adminRemove(id)
    setShowDeleteModal(null)
    load()
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={t('reviews.list.eyebrow')} title={t('reviews.list.title')} subtitle={t('reviews.list.subtitle', { count: total })} />

      <div className="flex items-center justify-end gap-3">
        <Dropdown value={sortOrder} onChange={(v) => { setSortOrder(v as SortOrder); setPage(1) }} options={sortOptions} size="sm" className="w-40" />
      </div>

      {loading ? (
        <PageLoader fullPage={false} />
      ) : error ? (
        <p className="text-danger text-sm">{error}</p>
      ) : (
        <Card>
          {reviews.map((review) => (
            <div key={review.id} className="flex items-start gap-4 p-5 border-b border-slate-100 last:border-b-0">
              <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-xs shrink-0">
                {(review.user?.fullName ?? review.user?.email ?? '?')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-semibold text-navy text-sm">{review.user?.fullName ?? review.user?.email}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-400">{review.room?.name}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-400">{new Date(review.createdAt).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex gap-0.5 mb-2">
                  <StarRating rating={review.rating} />
                </div>
                {review.comment && <p className="text-sm text-slate-600 leading-relaxed">"{review.comment}"</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={review.deletedAt ? 'DELETED' : 'ACTIVE'} config={REVIEW_STATUS_CONFIG} />
                {!review.deletedAt && (
                  <button onClick={() => setShowDeleteModal(review.id)} className="px-2.5 py-1 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                    {t('common.delete')}
                  </button>
                )}
              </div>
            </div>
          ))}
          {reviews.length === 0 && (
            <div className="p-16 text-center text-slate-400 text-sm">{t('reviews.list.empty')}</div>
          )}
          <Pagination page={page} total={total} perPage={PER_PAGE} onChange={setPage} />
        </Card>
      )}

      <ConfirmModal
        open={!!showDeleteModal}
        title={t('reviews.list.deleteTitle')}
        desc={t('reviews.list.deleteDesc')}
        confirmLabel={t('reviews.list.deleteConfirm')}
        danger
        onConfirm={() => handleDelete(showDeleteModal!)}
        onCancel={() => setShowDeleteModal(null)}
      />
    </div>
  )
}
