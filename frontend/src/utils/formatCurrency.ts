/**
 * Hàm format số tiền sang định dạng VND hoặc USD.
 * Mặc định USD - toàn bộ giá trong hệ thống (Room.pricePerNight,
 * Booking.totalPrice, Payment.amount) là số USD thô (vd RoomCard/
 * PriceSummaryCard hiển thị "$"), trước đây hàm này mặc định VND khiến các
 * màn dùng formatCurrency() không truyền currency (BookingCard,
 * BookingPaymentPage, PaymentHistoryPage) hiển thị nhầm "₫" cho cùng 1 số tiền.
 */
export function formatCurrency(amount: number, currency: 'VND' | 'USD' = 'USD'): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  // Mặc định VND
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}
