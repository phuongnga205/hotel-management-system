import type {
  Booking,
  BookingStatus,
  CreateBookingPayload,
  ListBookingsQuery,
  MessageResponse,
  PagedResult,
  RejectBookingPayload,
  UpdateBookingPayload
} from '../types'

const MOCK_DELAY_MS = 100

function mockDelay<T>(data: T, ms = MOCK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

function paginate<T>(items: T[], page = 1, limit = 10): PagedResult<T> {
  const start = (page - 1) * limit
  return { items: items.slice(start, start + limit), total: items.length, page, limit, totalPages: Math.max(1, Math.ceil(items.length / limit)) }
}

const ROOMS = [
  { id: '1', name: 'Grand Deluxe King', roomNumber: '101', thumbnailUrl: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800' },
  { id: '2', name: 'Ocean View Suite', roomNumber: '202', thumbnailUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800' },
  { id: '3', name: 'Garden Twin Room', roomNumber: '305', thumbnailUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800' }
]

const USER = { id: 'u1', fullName: 'Alex Johnson', email: 'alex.johnson@email.com', phone: '+1 (555) 234-5678' }

const generateRandomBookings = () => {
  const statuses: ('PENDING' | 'ACCEPTED' | 'CANCELLED')[] = ['PENDING', 'ACCEPTED', 'CANCELLED']
  const generated: Booking[] = []
  let idCounter = 1001
  
  // Generate exactly 20 bookings
  for (let i = 0; i < 20; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const room = ROOMS[Math.floor(Math.random() * ROOMS.length)]
    const pricePerNight = 100 + Math.floor(Math.random() * 400)
    const nights = Math.floor(Math.random() * 5) + 1
    const isPaid = status === 'ACCEPTED' && Math.random() > 0.5
    
    const checkInDay = 10 + Math.floor(Math.random() * 15)
    const checkInDate = `2026-08-${checkInDay.toString().padStart(2, '0')}`
    const checkOutDate = `2026-08-${(checkInDay + nights).toString().padStart(2, '0')}`
    
    const booking: Booking = {
      id: String(idCounter++),
      status,
      checkInDate,
      checkOutDate,
      pricePerNight,
      totalPrice: pricePerNight * nights,
      note: null,
      cancelReason: status === 'CANCELLED' ? 'Guest requested cancellation' : null,
      createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
      room,
      user: USER,
    }
    
    if (isPaid) {
      booking.payment = {
        id: `p${idCounter}`,
        bookingId: booking.id,
        amount: booking.totalPrice.toString(),
        method: 'VNPAY',
        status: 'SUCCESS',
        transactionId: `VNP-${Date.now()}`,
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    }
    generated.push(booking)
  }
  
  // Sort descending by created at
  return generated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

let bookings: Booking[] = generateRandomBookings()

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
    let filtered = bookings
    if (query.status) {
      filtered = filtered.filter(b => b.status === query.status)
    }
    return mockDelay(paginate(filtered, query.page, query.limit))
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
  updateBookingDates: async (id: string, data: UpdateBookingPayload): Promise<{ message: string, data: Booking }> => {
    const booking = bookings.find(b => b.id === id)
    if (!booking) throw new Error('Booking not found')
    
    // Simulate 409 conflict
    if (data.checkInDate === '2026-12-25') {
      const error: any = new Error('Room is already booked')
      error.response = { status: 409, data: { message: 'Room not available for these dates' } }
      throw error
    }

    const updated = { ...booking, checkInDate: data.checkInDate, checkOutDate: data.checkOutDate }
    bookings = bookings.map(b => b.id === id ? updated : b)
    return mockDelay({
      message: 'Booking dates updated successfully',
      data: updated
    })
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
