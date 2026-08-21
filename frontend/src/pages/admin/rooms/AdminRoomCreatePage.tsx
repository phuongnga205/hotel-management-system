import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import PageHeader from '../../../components/PageHeader'
import Card from '../../../components/Card'
import FieldLabel from '../../../components/FieldLabel'
import inputBase from '../../../components/inputBase'
import Dropdown from '../../../components/Dropdown'
import ImageLightbox from '../../../components/ImageLightbox'
import { Breadcrumb, AmenityCheckboxGroup, RoomImagePanel } from '../../../components/admin'
import { ROUTES } from '../../../router/paths'
import { roomApi } from '../../../api/room.api'
import { amenityApi } from '../../../api/amenity.api'
import { getErrorMessage } from '../../../api/errorMessage'
import type { Amenity, RoomViewType } from '../../../api/types'

const VIEW_TYPES: RoomViewType[] = ['CITY_VIEW', 'GARDEN_VIEW', 'SEA_VIEW']

interface StagedImage {
  id: string
  file: File
  url: string
}

export default function AdminRoomCreatePage() {
  const { t } = useTranslation('admin')
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [roomNumber, setRoomNumber] = useState('')
  const [roomType, setRoomType] = useState('')
  const [price, setPrice] = useState('')
  const [capacity, setCapacity] = useState('2')
  const [viewType, setViewType] = useState('')
  const [description, setDescription] = useState('')
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [amenityIds, setAmenityIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Chua co roomId (phong chua duoc tao) nen anh chi giu tam o client -
  // upload that len server sau khi tao phong thanh cong (xem handleSubmit).
  const [thumbnail, setThumbnail] = useState<StagedImage | null>(null)
  const [otherImages, setOtherImages] = useState<StagedImage[]>([])
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  useEffect(() => {
    amenityApi.list().then(setAmenities).catch(() => setAmenities([]))
  }, [])

  const toggleAmenity = (id: string) => {
    setAmenityIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]))
  }

  const viewOptions = [
    { value: '', label: t('rooms.form.fieldViewNone') },
    ...VIEW_TYPES.map((v) => ({ value: v, label: t(`rooms.viewType.${v}`) })),
  ]

  const handleAddThumbnail = (file: File) => {
    if (thumbnail) URL.revokeObjectURL(thumbnail.url)
    setThumbnail({ id: 'thumbnail', file, url: URL.createObjectURL(file) })
  }

  const handleRemoveThumbnail = () => {
    if (thumbnail) URL.revokeObjectURL(thumbnail.url)
    setThumbnail(null)
  }

  const handleAddOther = (file: File) => {
    setOtherImages((prev) => [...prev, { id: `staged-${Date.now()}-${prev.length}`, file, url: URL.createObjectURL(file) }])
  }

  const handleRemoveOther = (id: string) => {
    setOtherImages((prev) => {
      const target = prev.find((i) => i.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((i) => i.id !== id)
    })
  }

  // Chua co roomId nen khong the goi API setThumbnail - swap ngay tren state
  // cuc bo: anh phu duoc chon doi cho voi thumbnail hien tai (giu nguyen id
  // cua tung slot, chi hoan File/url cho nhau).
  const handleSetThumbnail = (otherId: string) => {
    const target = otherImages.find((i) => i.id === otherId)
    if (!target) return
    const prevThumbnail = thumbnail
    setThumbnail({ id: 'thumbnail', file: target.file, url: target.url })
    setOtherImages((prev) =>
      prevThumbnail
        ? prev.map((i) => (i.id === otherId ? { ...i, file: prevThumbnail.file, url: prevThumbnail.url } : i))
        : prev.filter((i) => i.id !== otherId),
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const room = await roomApi.create({
        name,
        roomNumber,
        roomType,
        pricePerNight: Number(price),
        capacity: Number(capacity),
        viewType: (viewType || undefined) as RoomViewType | undefined,
        description: description || undefined,
        amenityIds: amenityIds.length > 0 ? amenityIds : undefined,
      })

      try {
        if (thumbnail) await roomApi.addImage(room.id, thumbnail.file, true)
        for (const img of otherImages) {
          await roomApi.addImage(room.id, img.file, false)
        }
      } catch {
        toast.error(t('rooms.form.imageUploadFailed'))
      }

      navigate(ROUTES.ADMIN.ROOM_DETAIL(room.id))
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.notFoundGeneric')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: t('rooms.list.title'), to: ROUTES.ADMIN.ROOMS }, { label: t('rooms.form.newBreadcrumb') }]} />

      <PageHeader eyebrow={t('rooms.list.eyebrow')} title={t('rooms.form.createTitle')} />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
        <div className="space-y-5">
          <Card className="p-5 space-y-4">
            <h2 className="font-semibold text-navy text-sm uppercase tracking-wide">{t('rooms.form.sectionInfo')}</h2>

            <div>
              <FieldLabel>{t('rooms.form.fieldName')}</FieldLabel>
              <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputBase} border-slate-200`} placeholder={t('rooms.form.fieldNamePlaceholder')} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>{t('rooms.form.fieldRoomNumber')}</FieldLabel>
                <input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} className={`${inputBase} border-slate-200`} placeholder={t('rooms.form.fieldRoomNumberPlaceholder')} required />
              </div>
              <div>
                <FieldLabel>{t('rooms.form.fieldType')}</FieldLabel>
                <input value={roomType} onChange={(e) => setRoomType(e.target.value)} className={`${inputBase} border-slate-200`} placeholder={t('rooms.form.fieldTypePlaceholder')} required />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <FieldLabel>{t('rooms.form.fieldPrice')}</FieldLabel>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={`${inputBase} border-slate-200`} placeholder="320" required min="1" />
              </div>
              <div>
                <FieldLabel>{t('rooms.form.fieldCapacity')}</FieldLabel>
                <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} className={`${inputBase} border-slate-200`} required min="1" />
              </div>
              <div>
                <FieldLabel>{t('rooms.form.fieldView')}</FieldLabel>
                <Dropdown value={viewType} onChange={setViewType} options={viewOptions} />
              </div>
            </div>

            <div>
              <FieldLabel>{t('rooms.form.fieldDescription')}</FieldLabel>
              <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputBase} border-slate-200 resize-none`} placeholder={t('rooms.form.fieldDescriptionPlaceholder')} />
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <h2 className="font-semibold text-navy text-sm uppercase tracking-wide">{t('rooms.form.amenitiesSectionTitle')}</h2>
            <AmenityCheckboxGroup amenities={amenities} selectedIds={amenityIds} onToggle={toggleAmenity} emptyLabel={t('rooms.form.amenitiesEmpty')} />
          </Card>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-navy rounded-lg hover:opacity-90 disabled:opacity-70 flex items-center gap-2 transition-opacity"
            >
              {loading ? t('rooms.form.submitCreating') : t('rooms.form.submitCreate')}
            </button>
            <Link to={ROUTES.ADMIN.ROOMS} className="px-6 py-2.5 text-sm font-semibold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
              {t('common.cancel')}
            </Link>
          </div>
        </div>

        <Card className="p-5 space-y-3 lg:sticky lg:top-6">
          <h2 className="font-semibold text-navy text-sm uppercase tracking-wide">{t('rooms.form.imageSectionTitle')}</h2>
          <RoomImagePanel
            thumbnailUrl={thumbnail?.url ?? null}
            others={otherImages}
            busy={loading}
            onAddThumbnail={handleAddThumbnail}
            onRemoveThumbnail={handleRemoveThumbnail}
            onAddOther={handleAddOther}
            onRemoveOther={handleRemoveOther}
            onView={setLightboxSrc}
            onSetThumbnail={handleSetThumbnail}
          />
        </Card>
      </form>

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  )
}
