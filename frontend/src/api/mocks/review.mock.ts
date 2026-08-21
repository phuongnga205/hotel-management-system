import type { DeleteReviewPayload, ListReviewsQuery, MessageResponse, PagedResult, Review } from '../types'

const MOCK_DELAY_MS = 350

function mockDelay<T>(data: T, ms = MOCK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

function paginate<T>(items: T[], page = 1, limit = 10): PagedResult<T> {
  const start = (page - 1) * limit
  return { items: items.slice(start, start + limit), total: items.length, page, limit, totalPages: Math.max(1, Math.ceil(items.length / limit)) }
}

let reviews: Review[] = [
  {
    id: 'r1',
    bookingId: '1002',
    rating: 5,
    comment: 'Absolutely stunning room with an incredible ocean view. Staff was very attentive.',
    deleteReason: null,
    createdAt: '2026-08-18T09:00:00Z',
    deletedAt: null,
    room: { id: '2', name: 'Ocean View Suite', roomNumber: '202' },
    user: { id: 'u2', fullName: 'Isabella Romano', email: 'i.romano@mail.com', phone: null },
  },
  {
    id: 'r2',
    bookingId: '1004',
    rating: 4,
    comment: 'Great location and comfortable bed, but the AC was a bit noisy at night.',
    deleteReason: null,
    createdAt: '2026-08-12T14:00:00Z',
    deletedAt: null,
    room: { id: '1', name: 'Grand Deluxe King', roomNumber: '101' },
    user: { id: 'u1', fullName: 'Alex Johnson', email: 'alex.johnson@email.com', phone: null },
  },
]

export const reviewMockApi = {
  listByRoom: async (roomId: string, query: ListReviewsQuery): Promise<PagedResult<Review>> => {
    const filtered = reviews.filter((r) => r.room?.id === roomId && !r.deletedAt)
    return mockDelay(paginate(filtered, query.page, query.limit))
  },
  create: async (bookingId: string, rating: number, comment?: string): Promise<Review> => {
    const review: Review = {
      id: String(Date.now()),
      bookingId,
      rating,
      comment: comment ?? null,
      deleteReason: null,
      createdAt: new Date().toISOString(),
      deletedAt: null,
    }
    reviews = [review, ...reviews]
    return mockDelay(review)
  },
  adminList: async (query: ListReviewsQuery): Promise<PagedResult<Review>> => {
    const filtered = query.roomId ? reviews.filter((r) => r.room?.id === query.roomId) : reviews
    return mockDelay(paginate(filtered, query.page, query.limit))
  },
  adminRemove: async (id: string, data: DeleteReviewPayload): Promise<MessageResponse> => {
    reviews = reviews.map((r) => (r.id === id ? { ...r, deletedAt: new Date().toISOString(), deleteReason: data.deleteReason ?? null } : r))
    return mockDelay({ message: 'Review deleted (mock).' })
  },
}
