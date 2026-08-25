import type { AdminPayment, ListAdminPaymentsQuery, ListPaymentsQuery, PagedResult, UserPayment } from '../types'
import { bookings } from './booking.mock'

const MOCK_DELAY_MS = 400

function mockDelay<T>(data: T, ms = MOCK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

function paginate<T>(items: T[], page = 1, limit = 10): PagedResult<T> {
  const start = (page - 1) * limit
  return { items: items.slice(start, start + limit), total: items.length, page, limit, totalPages: Math.max(1, Math.ceil(items.length / limit)) }
}

// Cung nguon du lieu voi bookingMockApi (frontend/src/api/mocks/booking.mock.ts)
// nhung khong import cheo - moi payment o day tuong ung 1 booking mock da co
// san field `payment` ben do, chi khac view (kem ten khach/phong nhu response
// that cua GET /admin/payments).
const payments: AdminPayment[] = [
  {
    id: 'p1',
    bookingId: '1002',
    amount: '1440.00',
    method: 'VNPAY',
    status: 'SUCCESS',
    transactionId: 'VNP-2026081700001',
    paidAt: '2026-08-17T17:00:00Z',
    createdAt: '2026-08-17T17:00:00Z',
    booking: { id: '1002', guestName: 'Isabella Romano', guestEmail: 'i.romano@mail.com', roomName: 'Ocean View Suite', roomNumber: '202' },
  },
  {
    id: 'p2',
    bookingId: '1005',
    amount: '750.00',
    method: 'BANK_TRANSFER',
    status: 'PENDING',
    transactionId: null,
    paidAt: null,
    createdAt: '2026-08-19T14:15:00Z',
    booking: { id: '1005', guestName: 'Priya Nair', guestEmail: 'priya.nair@mail.com', roomName: 'City View Studio', roomNumber: '410' },
  },
  {
    id: 'p3',
    bookingId: '1006',
    amount: '800.00',
    method: 'CREDIT_CARD',
    status: 'FAILED',
    transactionId: 'CC-2026082000045',
    paidAt: null,
    createdAt: '2026-08-20T09:31:00Z',
    booking: { id: '1006', guestName: 'Tom Becker', guestEmail: 'tom.becker@mail.com', roomName: 'Ocean View Suite', roomNumber: '202' },
  },
  {
    id: 'p4',
    bookingId: '1007',
    amount: '600.00',
    method: 'VNPAY',
    status: 'REFUNDED',
    transactionId: 'VNP-2026072800012',
    paidAt: '2026-07-28T11:05:00Z',
    createdAt: '2026-07-28T11:05:00Z',
    booking: { id: '1007', guestName: 'Marcus Chen', guestEmail: 'mchen@corp.com', roomName: 'Garden Twin Room', roomNumber: '305' },
  },
]

export const paymentMockApi = {
  // Khac adminList() ben duoi (doc tu 1 fixture `payments` tinh, tach rieng) -
  // listMine() doc truc tiep tu `bookings` (booking.mock.ts) de phan anh dung
  // hanh dong that trong phien (vd vua tra tien 1 booking qua BookingPaymentPage
  // se thay ngay o day), khong bi "dong bang" o vai giao dich mau co san. Chi
  // lay payment MOI NHAT cua moi booking (giong dung field `booking.payment`
  // that - BE that co the co nhieu lan thu thanh toan/booking, mock don gian
  // hoa chi giu 1 ban ghi, chap nhan duoc cho muc dich demo).
  listMine: async (query: ListPaymentsQuery): Promise<PagedResult<UserPayment>> => {
    let mine: UserPayment[] = bookings
      .filter((b) => b.payment)
      .map((b) => ({
        ...b.payment!,
        booking: b.room
          ? { id: b.id, roomName: b.room.name, roomNumber: b.room.roomNumber, checkInDate: b.checkInDate, checkOutDate: b.checkOutDate }
          : undefined,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    if (query.status) mine = mine.filter((p) => p.status === query.status)
    if (query.method) mine = mine.filter((p) => p.method === query.method)

    return mockDelay(paginate(mine, query.page, query.limit))
  },
  adminList: async (query: ListAdminPaymentsQuery): Promise<PagedResult<AdminPayment>> => {
    let filtered = payments
    if (query.status) filtered = filtered.filter((p) => p.status === query.status)
    if (query.method) filtered = filtered.filter((p) => p.method === query.method)
    return mockDelay(paginate(filtered, query.page, query.limit))
  },
}
