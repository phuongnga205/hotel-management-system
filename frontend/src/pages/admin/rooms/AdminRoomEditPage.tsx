import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import PageHeader from '../../../components/PageHeader'
import Card from '../../../components/Card'
import FieldLabel from '../../../components/FieldLabel'
import inputBase from '../../../components/inputBase'
import Dropdown from '../../../components/Dropdown'
import { PageLoader } from '../../../components/common/PageLoader'
import ImageLightbox from '../../../components/ImageLightbox'
import { Breadcrumb, AmenityCheckboxGroup, RoomImagePanel } from '../../../components/admin'
import { ROUTES } from '../../../router/paths'
import { roomApi } from '../../../api/room.api'
import { amenityApi } from '../../../api/amenity.api'
import { getErrorMessage } from '../../../api/errorMessage'
import type { Amenity, Room, RoomViewType } from '../../../api/types'

const VIEW_TYPES: RoomViewType[] = ['CITY_VIEW', 'GARDEN_VIEW', 'SEA_VIEW']

export default function AdminRoomEditPage() {
  const { t } = useTranslation('admin')
  const { roomId } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [imageBusy, setImageBusy] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [roomType, setRoomType] = useState('')
  const [capacity, setCapacity] = useState('2')
  const [viewType, setViewType] = useState('')
  const [description, setDescription] = useState('')
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [amenityIds, setAmenityIds] = useState<string[]>([])

  const loadRoom = () => {
    if (!roomId) return
    setLoading(true)
    roomApi
      .adminGetById(roomId)
      .then((r) => {
        setRoom(r)
        setName(r.name)
        setRoomType(r.roomType)
        setCapacity(String(r.capacity))
        setViewType(r.viewType ?? '')
        setDescription(r.description ?? '')
        setAmenityIds((r.amenities ?? []).map((a) => a.id))
      })
      .catch(() => setRoom(null))
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-with-loading-flag pattern, xem AdminBookingListPage.tsx
  useEffect(loadRoom, [roomId])

  useEffect(() => {
    amenityApi.list().then(setAmenities).catch(() => setAmenities([]))
  }, [])

  if (loading) return <PageLoader />

  if (!room) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">{t('rooms.detail.notFound')}</p>
          <Link to={ROUTES.ADMIN.ROOMS} className="text-navy font-semibold hover:text-gold">{t('rooms.detail.backToList')}</Link>
        </div>
      </div>
    )
  }

  const viewOptions = [
    { value: '', label: t('rooms.form.fieldViewNone') },
    ...VIEW_TYPES.map((v) => ({ value: v, label: t(`rooms.viewType.${v}`) })),
  ]

  const toggleAmenity = (id: string) => {
    setAmenityIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await roomApi.update(room.id, {
        name,
        roomType,
        capacity: Number(capacity),
        viewType: (viewType || undefined) as RoomViewType | undefined,
        description: description || undefined,
      })

      // Dong bo tien nghi: so sanh voi tap ban dau, chi goi API cho phan
      // thay doi (them moi / go bo) thay vi gui lai toan bo moi lan.
      const originalIds = new Set((room.amenities ?? []).map((a) => a.id))
      const nextIds = new Set(amenityIds)
      const toAdd = amenityIds.filter((id) => !originalIds.has(id))
      const toRemove = [...originalIds].filter((id) => !nextIds.has(id))
      await Promise.all([
        toAdd.length > 0 ? roomApi.addAmenities(room.id, toAdd) : Promise.resolve(),
        ...toRemove.map((id) => roomApi.removeAmenity(room.id, id)),
      ])

      navigate(ROUTES.ADMIN.ROOM_DETAIL(room.id))
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.notFoundGeneric')))
    } finally {
      setSaving(false)
    }
  }

  const thumbnail = room.images?.find((i) => i.isThumbnail) ?? null
  const otherImages = (room.images ?? []).filter((i) => !i.isThumbnail).map((i) => ({ id: i.id, url: i.imageUrl }))

  const runImageAction = async (action: () => Promise<unknown>) => {
    setImageBusy(true)
    try {
      await action()
      loadRoom()
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.notFoundGeneric')))
    } finally {
      setImageBusy(false)
    }
  }

  const handleAddThumbnail = (file: File) =>
    runImageAction(async () => {
      if (thumbnail) await roomApi.removeImage(room.id, thumbnail.id)
      await roomApi.addImage(room.id, file, true)
    })

  const handleRemoveThumbnail = () => {
    if (!thumbnail) return
    runImageAction(() => roomApi.removeImage(room.id, thumbnail.id))
  }

  const handleAddOther = (file: File) => runImageAction(() => roomApi.addImage(room.id, file, false))

  const handleRemoveOther = (imageId: string) => runImageAction(() => roomApi.removeImage(room.id, imageId))

  // Dat 1 anh phu lam thumbnail - swap ngay tren server qua 1 API rieng
  // (khong xoa-roi-them lai), backend tu doi co isThumbnail giua 2 anh.
  const handleSetThumbnail = (otherId: string) => runImageAction(() => roomApi.setThumbnail(room.id, otherId))

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: t('rooms.list.title'), to: ROUTES.ADMIN.ROOMS }, { label: room.name, to: ROUTES.ADMIN.ROOM_DETAIL(room.id) }, { label: t('rooms.form.editBreadcrumb') }]} />

      <PageHeader eyebrow={t('rooms.list.eyebrow')} title={t('rooms.form.editTitle')} />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
        <div className="space-y-5">
          <Card className="p-5 space-y-4">
            <h2 className="font-semibold text-navy text-sm uppercase tracking-wide">{t('rooms.form.sectionInfo')}</h2>

            <div>
              <FieldLabel>{t('rooms.form.fieldName')}</FieldLabel>
              <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputBase} border-slate-200`} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>{t('rooms.form.fieldType')}</FieldLabel>
                <input value={roomType} onChange={(e) => setRoomType(e.target.value)} className={`${inputBase} border-slate-200`} required />
              </div>
              <div>
                <FieldLabel>{t('rooms.form.fieldCapacity')}</FieldLabel>
                <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} className={`${inputBase} border-slate-200`} required min="1" />
              </div>
            </div>

            <div>
              <FieldLabel>{t('rooms.form.fieldView')}</FieldLabel>
              <Dropdown value={viewType} onChange={setViewType} options={viewOptions} />
            </div>

            <div>
              <FieldLabel>{t('rooms.form.fieldDescription')}</FieldLabel>
              <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputBase} border-slate-200 resize-none`} />
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <h2 className="font-semibold text-navy text-sm uppercase tracking-wide">{t('rooms.form.amenitiesSectionTitle')}</h2>
            <AmenityCheckboxGroup amenities={amenities} selectedIds={amenityIds} onToggle={toggleAmenity} emptyLabel={t('rooms.form.amenitiesEmpty')} />
          </Card>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-navy rounded-lg hover:opacity-90 disabled:opacity-70 flex items-center gap-2 transition-opacity"
            >
              {saving ? t('rooms.form.submitSaving') : t('rooms.form.submitSave')}
            </button>
            <Link to={ROUTES.ADMIN.ROOM_DETAIL(room.id)} className="px-6 py-2.5 text-sm font-semibold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
              {t('common.cancel')}
            </Link>
          </div>
        </div>

        <Card className="p-5 space-y-3 lg:sticky lg:top-6">
          <h2 className="font-semibold text-navy text-sm uppercase tracking-wide">{t('rooms.form.imageSectionTitle')}</h2>
          <RoomImagePanel
            thumbnailUrl={thumbnail?.imageUrl ?? null}
            others={otherImages}
            busy={imageBusy}
            onAddThumbnail={handleAddThumbnail}
            onRemoveThumbnail={handleRemoveThumbnail}
            onAddOther={handleAddOther}
            onRemoveOther={handleRemoveOther}
            onView={setLightboxSrc}
            onSetThumbnail={handleSetThumbnail}
          />
        </Card>
      </form>

      <ImageLightbox src={lightboxSrc} alt={room.name} onClose={() => setLightboxSrc(null)} />
    </div>
  )
}
