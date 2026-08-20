import type {
  Booking,
  BookingStatus,
  CreateBookingPayload,
  ListBookingsQuery,
  MessageResponse,
  PagedResult,
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
