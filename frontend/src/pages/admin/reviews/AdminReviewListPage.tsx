import { useState } from 'react'
import { REVIEWS } from '../../../data/mock'
import { PageHeader, Card, StarRating } from '../../../components/ui'
import { ConfirmModal, StatusBadge, REVIEW_STATUS_CONFIG } from '../../../components/admin'

export default function AdminReviewListPage() {
  const [reviews, setReviews] = useState(REVIEWS)
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)

  const handleDelete = (id: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== id))
    setShowDeleteModal(null)
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Moderation 🚧" title="Reviews" subtitle={reviews.length + ' published reviews'} />

      <Card>
        {reviews.map((review) => (
          <div key={review.id} className="flex items-start gap-4 p-5 border-b border-slate-100 last:border-b-0">
            <img src={review.userAvatar} alt={review.userName} className="w-10 h-10 rounded-full object-cover bg-slate-200 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-navy text-sm">{review.userName}</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-400">{review.roomName}</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-400">{new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="flex gap-0.5 mb-2">
                <StarRating rating={review.rating} />
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">"{review.comment}"</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge status="PUBLISHED" config={REVIEW_STATUS_CONFIG} />
              <button onClick={() => setShowDeleteModal(review.id)} className="px-2.5 py-1 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                Delete
              </button>
            </div>
          </div>
        ))}
        {reviews.length === 0 && (
          <div className="p-16 text-center text-slate-400 text-sm">No reviews to moderate.</div>
        )}
      </Card>

      <ConfirmModal
        open={!!showDeleteModal}
        title="Delete Review?"
        desc="The author will be notified by email. This cannot be undone."
        confirmLabel="Delete Review"
        danger
        onConfirm={() => handleDelete(showDeleteModal!)}
        onCancel={() => setShowDeleteModal(null)}
      />
    </div>
  )
}
