import { useRef, useState } from 'react'
import { Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { PlusOutlined, CloseOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

export interface RoomImagePanelItem {
  id: string
  url: string
}

interface RoomImagePanelProps {
  thumbnailUrl: string | null
  others: RoomImagePanelItem[]
  maxOthers?: number
  busy?: boolean
  onAddThumbnail: (file: File) => void
  onRemoveThumbnail: () => void
  onAddOther: (file: File) => void
  onRemoveOther: (id: string) => void
  // Click vao 1 anh da co san (khong phai o "+") mo popup nho: "Xem" (mo
  // lightbox) + rieng anh phu con co them "Dat lam anh dai dien" (thumbnail
  // hien tai khong co tuy chon nay vi no dang la thumbnail roi).
  onView: (url: string) => void
  onSetThumbnail: (otherId: string) => void
}

/**
 * Card upload anh phong dung chung cho Create/Edit Room: 1 the lon dashed
 * cho thumbnail, ben duoi la luoi 3-cot cac o vuong dashed cho anh phu.
 * Dien tuan tu: o trong ke tiep hien dau "+" de them, het slot thi an dau
 * "+" di. Component chi lo hien thi + goi callback - noi goi (Create dung
 * state cuc bo cho toi khi tao phong xong, Edit goi thang roomApi) tu quyet
 * dinh se lam gi voi file duoc chon.
 */
export default function RoomImagePanel({
  thumbnailUrl,
  others,
  maxOthers = 6,
  busy = false,
  onAddThumbnail,
  onRemoveThumbnail,
  onAddOther,
  onRemoveOther,
  onView,
  onSetThumbnail,
}: RoomImagePanelProps) {
  const { t } = useTranslation('admin')
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendingTarget, setPendingTarget] = useState<'thumbnail' | 'other' | null>(null)

  const thumbnailMenuItems: MenuProps['items'] = [
    { key: 'view', label: t('rooms.form.imageViewAction') },
  ]

  const otherMenuItems: MenuProps['items'] = [
    { key: 'view', label: t('rooms.form.imageViewAction') },
    { key: 'setThumbnail', label: t('rooms.form.imageSetThumbnailAction') },
  ]

  const openPicker = (target: 'thumbnail' | 'other') => {
    if (busy) return
    setPendingTarget(target)
    inputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (pendingTarget === 'thumbnail') onAddThumbnail(file)
    else if (pendingTarget === 'other') onAddOther(file)
    setPendingTarget(null)
  }

  return (
    <div className="space-y-3">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />

      {thumbnailUrl ? (
        <div className="relative rounded-2xl overflow-hidden aspect-video border border-slate-200 bg-slate-100">
          <Dropdown
            menu={{ items: thumbnailMenuItems, onClick: () => onView(thumbnailUrl) }}
            trigger={['click']}
            disabled={busy}
          >
            <img src={thumbnailUrl} alt="" className="w-full h-full object-cover cursor-pointer" />
          </Dropdown>
          <button
            type="button"
            disabled={busy}
            onClick={onRemoveThumbnail}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors disabled:opacity-60"
            aria-label={t('rooms.form.imageRemoveButton')}
          >
            <CloseOutlined className="text-xs" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => openPicker('thumbnail')}
          className="w-full aspect-video rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-gold hover:text-gold transition-colors disabled:opacity-60"
        >
          <PlusOutlined className="text-2xl" />
          <span className="text-sm font-medium">{t('rooms.form.insertThumbnailLabel')}</span>
        </button>
      )}

      <div className="grid grid-cols-3 gap-3">
        {others.map((img) => (
          <div key={img.id} className="relative rounded-xl overflow-hidden aspect-square border border-slate-200 bg-slate-100">
            <Dropdown
              menu={{
                items: otherMenuItems,
                onClick: ({ key }) => (key === 'setThumbnail' ? onSetThumbnail(img.id) : onView(img.url)),
              }}
              trigger={['click']}
              disabled={busy}
            >
              <img src={img.url} alt="" className="w-full h-full object-cover cursor-pointer" />
            </Dropdown>
            <button
              type="button"
              disabled={busy}
              onClick={() => onRemoveOther(img.id)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors disabled:opacity-60"
              aria-label={t('rooms.form.imageRemoveButton')}
            >
              <CloseOutlined className="text-[10px]" />
            </button>
          </div>
        ))}
        {others.length < maxOthers && (
          <button
            type="button"
            disabled={busy}
            onClick={() => openPicker('other')}
            className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-gold hover:text-gold transition-colors disabled:opacity-60"
          >
            <PlusOutlined className="text-lg" />
          </button>
        )}
      </div>
    </div>
  )
}
