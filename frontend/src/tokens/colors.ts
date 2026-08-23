/**
 * Với CSS/Tailwind utility classes (`text-navy`, `bg-gold`...), dùng
 * `@theme` trong `src/index.css` — các giá trị `--color-*` ở đó PHẢI khớp
 * chính xác với object bên dưới (2 file phải đồng bộ, xem comment ở
 * `index.css`).
 */
export const colors = {
  // Brand
  navy: '#0B2545',
  navyLight: '#1A3A5C',
  navyDark: '#071830',
  gold: '#C9A84C',
  goldLight: '#E8C97A',
  goldDark: '#A6832A',
  surface: '#F4F6F9',
  border: '#E2E8F0',

  // Semantic status
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  muted: '#64748B',
  accent: '#7C3AED',
} as const

export type ColorToken = keyof typeof colors

/**
 * Chuyen 1 token hex sang rgba() voi do mo alpha cho - dung khi can 1 mau
 * ban trong suot (box-shadow, overlay...) ma van phai bat nguon tu bang
 * mau chung nay, khong duoc go cung rgb() rieng o tung file.
 */
export function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
