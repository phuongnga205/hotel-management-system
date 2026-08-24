import { useTranslation } from 'react-i18next'
import { CloseOutlined } from '@ant-design/icons'

interface ImageLightboxProps {
  src: string | null
  alt?: string
  onClose: () => void
}

/**
 * Popup zoom anh dung chung: nen mo den, anh phong to giua man hinh, dong
 * bang nut X hoac click ra ngoai. Dung o trang chi tiet phong (xem anh) va
 * trong RoomImagePanel (tuy chon "Xem" cua popup tren moi anh).
 */
export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const { t } = useTranslation('common')

  if (!src) return null

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t('common.close')}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        <CloseOutlined />
      </button>
      <img
        src={src}
        alt={alt ?? ''}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
      />
    </div>
  )
}
