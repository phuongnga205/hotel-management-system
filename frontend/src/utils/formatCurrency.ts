/**
 * Hàm format số tiền sang định dạng VND hoặc USD
 */
export function formatCurrency(amount: number, currency: 'VND' | 'USD' = 'VND'): string {
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
