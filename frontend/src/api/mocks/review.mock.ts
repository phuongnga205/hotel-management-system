import type { ListReviewsQuery, MessageResponse, PagedResult, Review } from '../types'
import { bookings } from './booking.mock'

const MOCK_DELAY_MS = 350

// Gia lap loi dung shape axios that (isAxiosError + response.status/data.message)
// - getErrorStatusCode()/getErrorMessage() o api/errorMessage.ts dua vao axios.isAxiosError().
function apiError(status: number, message: string) {
  return Object.assign(new Error(message), { isAxiosError: true, response: { status, data: { message } } })
}

function mockDelay<T>(data: T, ms = MOCK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

function paginate<T>(items: T[], page = 1, limit = 10): PagedResult<T> {
  const start = (page - 1) * limit
  return { items: items.slice(start, start + limit), total: items.length, page, limit, totalPages: Math.max(1, Math.ceil(items.length / limit)) }
}

// Export de booking.mock.ts's listMine() tinh booking.hasReview (khop dung
// hanh vi BE - BookingsService.fetchReviewedBookingIds()), dung chung 1
// nguon fixture giong cach booking.mock.ts export `bookings`.
export let reviews: Review[] = [
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
  // Mock khong mo phong scope theo userId that (giong bookingMockApi.listMine()
  // - 1 nguon fixture dung chung cho moi phien dang nhap trong mock mode,
  // khong tach rieng "cua ai"), chi tra toan bo review chua bi xoa.
  listMine: async (query: ListReviewsQuery): Promise<PagedResult<Review>> => {
    const filtered = reviews.filter((r) => !r.deletedAt)
    return mockDelay(paginate(filtered, query.page, query.limit))
  },
  // Cong khai, toan he thong - khop GET /reviews that (dung cho carousel
  // "Guest Stories" o HomePage), moi nhat truoc.
  listAll: async (query: ListReviewsQuery): Promise<PagedResult<Review>> => {
    const filtered = reviews
      .filter((r) => !r.deletedAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return mockDelay(paginate(filtered, query.page, query.limit))
  },
  // Khop dung logic that o ReviewsService.create() (backend/src/reviews/reviews.service.ts):
  // booking phai ACCEPTED + co payment SUCCESS + da qua checkOutDate (400 neu khong),
  // moi booking chi review duoc 1 lan (409 neu da review).
  create: async (bookingId: string, rating: number, comment?: string): Promise<Review> => {
    const booking = bookings.find((b) => b.id === bookingId)
    if (!booking) throw apiError(404, 'Booking not found (mock).')

    const hasPaidPayment = booking.payment?.status === 'SUCCESS'
    const isPastCheckout = new Date() >= new Date(booking.checkOutDate)
    if (booking.status !== 'ACCEPTED' || !hasPaidPayment || !isPastCheckout) {
      throw apiError(400, 'Booking is not completed yet (mock).')
    }

    const existingReview = reviews.find((r) => r.bookingId === bookingId && !r.deletedAt)
    if (existingReview) throw apiError(409, 'This booking has already been reviewed (mock).')

    const review: Review = {
      id: String(Date.now()),
      bookingId,
      rating,
      comment: comment ?? null,
      deleteReason: null,
      createdAt: new Date().toISOString(),
      deletedAt: null,
      room: booking.room ? { id: booking.room.id, name: booking.room.name, roomNumber: booking.room.roomNumber } : undefined,
    }
    reviews = [review, ...reviews]
    return mockDelay(review)
  },
  adminList: async (query: ListReviewsQuery): Promise<PagedResult<Review>> => {
    const filtered = query.roomId ? reviews.filter((r) => r.room?.id === query.roomId) : reviews
    return mockDelay(paginate(filtered, query.page, query.limit))
  },
  // Khong nhan ly do tu client - khop dung nghiep vu that: BE tu gan 1
  // template co dinh, khong doc body nao ca (xem review.api.ts).
  adminRemove: async (id: string): Promise<MessageResponse> => {
    reviews = reviews.map((r) => (r.id === id ? { ...r, deletedAt: new Date().toISOString(), deleteReason: 'Removed by admin (mock).' } : r))
    return mockDelay({ message: 'Review deleted (mock).' })
  },
}
