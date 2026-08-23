import type {
  Booking,
  BookingStatus,
  CreateBookingPayload,
  ListBookingsQuery,
  MessageResponse,
  PagedResult,
  PayBookingPayload,
  RejectBookingPayload,
} from '../types'

const MOCK_DELAY_MS = 400

function mockDelay<T>(data: T, ms = MOCK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

function paginate<T>(items: T[], page = 1, limit = 10): PagedResult<T> {
  const start = (page - 1) * limit
  return { items: items.slice(start, start + limit), total: items.length, page, limit, totalPages: Math.max(1, Math.ceil(items.length / limit)) }
}

let bookings: Booking[] = [
  {
    id: '1001',
    status: 'PENDING',
    checkInDate: '2026-08-25',
    checkOutDate: '2026-08-28',
    pricePerNight: 320,
    totalPrice: 960,
    note: 'Late check-in around 11pm.',
    cancelReason: null,
    createdAt: '2026-08-18T10:21:00Z',
    room: { id: '1', name: 'Grand Deluxe King', roomNumber: '101', thumbnailUrl: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800' },
    user: { id: 'u1', fullName: 'Alex Johnson', email: 'alex.johnson@email.com', phone: '+1 (555) 234-5678' },
  },
  {
    id: '1002',
    status: 'ACCEPTED',
    checkInDate: '2026-08-20',
    checkOutDate: '2026-08-23',
    pricePerNight: 480,
    totalPrice: 1440,
    note: null,
    cancelReason: null,
    createdAt: '2026-08-17T16:45:00Z',
    room: { id: '2', name: 'Ocean View Suite', roomNumber: '202', thumbnailUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800' },
    user: { id: 'u2', fullName: 'Isabella Romano', email: 'i.romano@mail.com', phone: '+39 02 1234 5678' },
    payment: { id: 'p1', bookingId: '1002', amount: '1440.00', method: 'VNPAY', status: 'SUCCESS', transactionId: 'VNP-2026081700001', paidAt: '2026-08-17T17:00:00Z', createdAt: '2026-08-17T17:00:00Z' },
  },
  {
    id: '1003',
    status: 'REJECTED',
    checkInDate: '2026-08-16',
    checkOutDate: '2026-08-17',
    pricePerNight: 180,
    totalPrice: 180,
    note: null,
    cancelReason: 'Room under maintenance for requested dates.',
    createdAt: '2026-08-15T09:00:00Z',
    room: { id: '3', name: 'Garden Twin Room', roomNumber: '305', thumbnailUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800' },
    user: { id: 'u3', fullName: 'Marcus Chen', email: 'mchen@corp.com', phone: '+65 9123 4567' },
  },
  {
    id: '1004',
    status: 'CANCELLED',
    checkInDate: '2026-08-10',
    checkOutDate: '2026-08-12',
    pricePerNight: 320,
    totalPrice: 640,
    note: null,
    cancelReason: 'Guest requested cancellation.',
    createdAt: '2026-08-05T08:00:00Z',
    room: { id: '1', name: 'Grand Deluxe King', roomNumber: '101', thumbnailUrl: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800' },
    user: { id: 'u1', fullName: 'Alex Johnson', email: 'alex.johnson@email.com', phone: '+1 (555) 234-5678' },
  },
  // 3 booking dưới đây thêm để UI có đủ mẫu cho các payment.status còn lại
  // (PENDING/FAILED/REFUNDED) — 1001-1004 ở trên chỉ phủ NONE (chưa có
  // payment) và SUCCESS, xem PAYMENT_STATUS_CONFIG.
  {
    id: '1005',
    status: 'ACCEPTED',
    checkInDate: '2026-09-05',
    checkOutDate: '2026-09-08',
    pricePerNight: 250,
    totalPrice: 750,
    note: null,
    cancelReason: null,
    createdAt: '2026-08-19T14:10:00Z',
    room: { id: '4', name: 'City View Studio', roomNumber: '410', thumbnailUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800' },
    user: { id: 'u4', fullName: 'Priya Nair', email: 'priya.nair@mail.com', phone: '+91 98765 43210' },
    // Trả tại khách sạn (BANK_TRANSFER), đang chờ ngân hàng xác nhận.
    payment: { id: 'p2', bookingId: '1005', amount: '750.00', method: 'BANK_TRANSFER', status: 'PENDING', transactionId: null, paidAt: null, createdAt: '2026-08-19T14:15:00Z' },
  },
  {
    id: '1006',
    status: 'PENDING',
    checkInDate: '2026-09-10',
    checkOutDate: '2026-09-12',
    pricePerNight: 400,
    totalPrice: 800,
    note: null,
    cancelReason: null,
    createdAt: '2026-08-20T09:30:00Z',
    room: { id: '2', name: 'Ocean View Suite', roomNumber: '202', thumbnailUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800' },
    user: { id: 'u5', fullName: 'Tom Becker', email: 'tom.becker@mail.com', phone: '+49 30 1234567' },
    // Thẻ bị từ chối - booking vẫn PENDING, khách được thử pay lại.
    payment: { id: 'p3', bookingId: '1006', amount: '800.00', method: 'CREDIT_CARD', status: 'FAILED', transactionId: 'CC-2026082000045', paidAt: null, createdAt: '2026-08-20T09:31:00Z' },
  },
  {
    id: '1007',
    status: 'CANCELLED',
    checkInDate: '2026-08-01',
    checkOutDate: '2026-08-03',
    pricePerNight: 300,
    totalPrice: 600,
    note: null,
    cancelReason: 'Guest cancelled after payment; refund processed.',
    createdAt: '2026-07-28T11:00:00Z',
    room: { id: '3', name: 'Garden Twin Room', roomNumber: '305', thumbnailUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800' },
    user: { id: 'u3', fullName: 'Marcus Chen', email: 'mchen@corp.com', phone: '+65 9123 4567' },
    // Đã thanh toán thành công rồi huỷ -> hoàn tiền.
    payment: { id: 'p4', bookingId: '1007', amount: '600.00', method: 'VNPAY', status: 'REFUNDED', transactionId: 'VNP-2026072800012', paidAt: '2026-07-28T11:05:00Z', createdAt: '2026-07-28T11:05:00Z' },
  },
]

export const bookingMockApi = {
  create: async (data: CreateBookingPayload): Promise<Booking> => {
    const booking: Booking = {
      id: String(Date.now()),
      status: 'PENDING',
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      pricePerNight: 0,
      totalPrice: 0,
      note: data.note ?? null,
      cancelReason: null,
      createdAt: new Date().toISOString(),
    }
    bookings = [booking, ...bookings]
    return mockDelay(booking)
  },
  listMine: async (query: ListBookingsQuery): Promise<PagedResult<Booking>> => {
    return mockDelay(paginate(bookings, query.page, query.limit))
  },
  getById: async (id: string): Promise<Booking> => {
    const booking = bookings.find((b) => b.id === id)
    if (!booking) throw new Error('Booking not found (mock).')
    return mockDelay(booking)
  },
  cancel: async (id: string): Promise<MessageResponse> => {
    bookings = bookings.map((b) => (b.id === id ? { ...b, status: 'CANCELLED' as BookingStatus } : b))
    return mockDelay({ message: 'Booking cancelled (mock).' })
  },
  // Khop dung nghiep vu that: amount luon lay tu booking.totalPrice (khong
  // nhan tu payload), thanh toan mock luon SUCCESS ngay lap tuc va tu
  // chuyen booking sang ACCEPTED - xem BookingsService.pay() o backend.
  pay: async (id: string, data: PayBookingPayload): Promise<MessageResponse> => {
    bookings = bookings.map((b) =>
      b.id === id
        ? {
            ...b,
            status: 'ACCEPTED' as BookingStatus,
            payment: {
              id: `p-${Date.now()}`,
              bookingId: id,
              amount: b.totalPrice.toFixed(2),
              method: data.method,
              status: 'SUCCESS',
              transactionId: `MOCK-${Date.now()}`,
              paidAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            },
          }
        : b,
    )
    return mockDelay({ message: 'Payment completed (mock).' })
  },
  adminList: async (query: ListBookingsQuery): Promise<PagedResult<Booking>> => {
    let filtered = bookings
    if (query.status) filtered = filtered.filter((b) => b.status === query.status)
    if (query.search) {
      const q = query.search.toLowerCase()
      filtered = filtered.filter(
        (b) => b.id.includes(q) || b.user?.fullName?.toLowerCase().includes(q) || b.room?.name.toLowerCase().includes(q),
      )
    }
    return mockDelay(paginate(filtered, query.page, query.limit))
  },
  adminGetById: async (id: string): Promise<Booking> => {
    const booking = bookings.find((b) => b.id === id)
    if (!booking) throw new Error('Booking not found (mock).')
    return mockDelay(booking)
  },
  accept: async (id: string): Promise<MessageResponse> => {
    bookings = bookings.map((b) => (b.id === id ? { ...b, status: 'ACCEPTED' as BookingStatus } : b))
    return mockDelay({ message: 'Booking accepted (mock).' })
  },
  reject: async (id: string, data: RejectBookingPayload): Promise<MessageResponse> => {
    bookings = bookings.map((b) => (b.id === id ? { ...b, status: 'REJECTED' as BookingStatus, cancelReason: data.cancelReason ?? null } : b))
    return mockDelay({ message: 'Booking rejected (mock).' })
  },
}
