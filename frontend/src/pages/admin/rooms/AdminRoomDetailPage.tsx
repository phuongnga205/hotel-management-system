import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageHeader from '../../../components/PageHeader'
import Card from '../../../components/Card'
import { PageLoader } from '../../../components/common/PageLoader'
import RoomTypeBadge from '../../../components/RoomTypeBadge'
import ImageLightbox from '../../../components/ImageLightbox'
import { Breadcrumb, StatusBadge, ROOM_STATUS_CONFIG } from '../../../components/admin'
import { ROUTES } from '../../../router/paths'
import { roomApi } from '../../../api/room.api'
import type { Room } from '../../../api/types'

export default function AdminRoomDetailPage() {
  const { t } = useTranslation('admin')
  const { roomId } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!roomId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-with-loading-flag pattern, xem AdminBookingListPage.tsx
    setLoading(true)
    roomApi
      .adminGetById(roomId)
      .then(setRoom)
      .catch(() => setRoom(null))
      .finally(() => setLoading(false))
  }, [roomId])

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

  const thumb = room.images?.find((i) => i.isThumbnail)?.imageUrl ?? room.images?.[0]?.imageUrl
  const otherImages = (room.images ?? []).filter((i) => !i.isThumbnail)

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: t('rooms.list.title'), to: ROUTES.ADMIN.ROOMS }, { label: room.name }]} />

      <PageHeader
        title={room.name}
        action={<button onClick={() => navigate(ROUTES.ADMIN.ROOM_EDIT(room.id))} className="px-5 py-2.5 text-sm font-semibold text-white bg-navy rounded-lg hover:opacity-90 transition-opacity">{t('rooms.detail.editRoom')}</button>}
      />
      <div className="flex items-center gap-3 -mt-6 mb-4">
        <RoomTypeBadge type={room.roomType} />
        <StatusBadge status={room.status} config={ROOM_STATUS_CONFIG} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div className="space-y-3">
          <div className="rounded-2xl overflow-hidden h-64 bg-slate-200">
            {thumb && (
              <img
                src={thumb}
                alt={room.name}
                onClick={() => setLightboxSrc(thumb)}
                className="w-full h-full object-cover cursor-pointer"
              />
            )}
          </div>

          {otherImages.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {otherImages.map((img) => (
                <img
                  key={img.id}
                  src={img.imageUrl}
                  alt={room.name}
                  onClick={() => setLightboxSrc(img.imageUrl)}
                  className="w-28 h-20 object-cover rounded-lg border border-slate-200 shrink-0 cursor-pointer"
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="font-semibold text-navy text-sm uppercase tracking-wide mb-4">{t('rooms.detail.detailsTitle')}</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: t('rooms.detail.fieldPrice'), val: `$${room.pricePerNight}` },
                { label: t('rooms.detail.fieldRoomNumber'), val: room.roomNumber },
                { label: t('rooms.detail.fieldCapacity'), val: String(room.capacity) },
                { label: t('rooms.detail.fieldView'), val: room.viewType ? t(`rooms.viewType.${room.viewType}`) : '—' },
                { label: t('rooms.detail.fieldType'), val: room.roomType },
              ].map(({ label, val }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-navy">{val}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('rooms.detail.amenitiesTitle')}</div>
              <div className="flex flex-wrap gap-1.5">
                {room.amenities && room.amenities.length > 0
                  ? room.amenities.map((a) => <span key={a.id} className="text-xs bg-surface text-slate-600 px-2 py-0.5 rounded-md">{a.name}</span>)
                  : <span className="text-xs text-slate-400">{t('rooms.detail.noAmenities')}</span>}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-navy text-sm uppercase tracking-wide mb-2">{t('rooms.detail.descriptionTitle')}</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{room.description || t('rooms.detail.noDescription')}</p>
          </Card>
        </div>
      </div>

      <ImageLightbox src={lightboxSrc} alt={room.name} onClose={() => setLightboxSrc(null)} />
    </div>
  )
}
