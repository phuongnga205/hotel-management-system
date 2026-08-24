import type { StatusConfig } from './StatusBadge'

// ---------------------------------------------------------------------------
// Cac bang config theo tung loai status - tach rieng khoi StatusBadge.tsx
// (chi con export component) vi 1 file vua export component vua export
// const se lam hong React Fast Refresh (react-refresh/only-export-components).
// ---------------------------------------------------------------------------

export const USER_STATUS_CONFIG: StatusConfig = {
  ACTIVE: { labelKey: 'status.user.ACTIVE', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  INACTIVE: { labelKey: 'status.user.INACTIVE', bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
}

export const ROOM_STATUS_CONFIG: StatusConfig = {
  ACTIVE: { labelKey: 'status.room.ACTIVE', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  INACTIVE: { labelKey: 'status.room.INACTIVE', bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
  MAINTENANCE: { labelKey: 'status.room.MAINTENANCE', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
}

export const BOOKING_STATUS_CONFIG: StatusConfig = {
  PENDING: { labelKey: 'status.booking.PENDING', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  ACCEPTED: { labelKey: 'status.booking.ACCEPTED', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  REJECTED: { labelKey: 'status.booking.REJECTED', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' },
  CANCELLED: { labelKey: 'status.booking.CANCELLED', bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
  EXPIRED: { labelKey: 'status.booking.EXPIRED', bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
}

export const PAYMENT_STATUS_CONFIG: StatusConfig = {
  // "NONE" khong phai gia tri PaymentStatus that o backend - dung khi booking
  // chua co payment nao (chua tra tien), do FE tu suy ra tu `booking.payment`
  // rong, khong phai 1 status tra ve tu API.
  NONE: { labelKey: 'status.payment.NONE', bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
  PENDING: { labelKey: 'status.payment.PENDING', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  SUCCESS: { labelKey: 'status.payment.SUCCESS', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  FAILED: { labelKey: 'status.payment.FAILED', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' },
  REFUNDED: { labelKey: 'status.payment.REFUNDED', bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
}

export const EMAIL_LOG_STATUS_CONFIG: StatusConfig = {
  PENDING: { labelKey: 'status.email.PENDING', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  SENT: { labelKey: 'status.email.SENT', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  FAILED: { labelKey: 'status.email.FAILED', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' },
}

// Review khong co field "status" that o backend - suy ra tu deletedAt
// (xem Review type o api/types.ts), 2 key la ACTIVE/DELETED tu suy luan
// phia FE, khong phai enum backend.
export const REVIEW_STATUS_CONFIG: StatusConfig = {
  ACTIVE: { labelKey: 'status.review.ACTIVE', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  DELETED: { labelKey: 'status.review.DELETED', bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
}
