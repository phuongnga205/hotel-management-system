import type { BookingStatistics, RevenueStatistics } from '../types'

const MOCK_DELAY_MS = 400

function mockDelay<T>(data: T, ms = MOCK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

const bookingStats: BookingStatistics = {
  totalBookings: 214,
  byStatus: { PENDING: 18, ACCEPTED: 142, REJECTED: 12, CANCELLED: 34, EXPIRED: 8 },
  monthly: [
    { month: 'Jan', count: 18 },
    { month: 'Feb', count: 22 },
    { month: 'Mar', count: 31 },
    { month: 'Apr', count: 24 },
    { month: 'May', count: 38 },
    { month: 'Jun', count: 45 },
    { month: 'Jul', count: 52 },
    { month: 'Aug', count: 41 },
  ],
}

const revenueStats: RevenueStatistics = {
  totalRevenue: 812000,
  monthly: [
    { month: 'Jan', revenue: 62000 },
    { month: 'Feb', revenue: 71000 },
    { month: 'Mar', revenue: 84000 },
    { month: 'Apr', revenue: 79000 },
    { month: 'May', revenue: 96000 },
    { month: 'Jun', revenue: 108000 },
    { month: 'Jul', revenue: 121000 },
    { month: 'Aug', revenue: 105000 },
  ],
  byRoomType: [
    { roomType: 'Single', revenue: 18000 },
    { roomType: 'Standard Twin', revenue: 42000 },
    { roomType: 'Deluxe King', revenue: 178000 },
    { roomType: 'Suite', revenue: 295000 },
    { roomType: 'Penthouse', revenue: 162000 },
  ],
}

export const statisticsMockApi = {
  bookings: async (): Promise<BookingStatistics> => mockDelay(bookingStats),
  revenue: async (): Promise<RevenueStatistics> => mockDelay(revenueStats),
}
