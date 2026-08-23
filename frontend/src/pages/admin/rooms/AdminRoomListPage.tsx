import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageHeader from '../../../components/PageHeader'
import Card from '../../../components/Card'
import { PageLoader } from '../../../components/common/PageLoader'
import RoomTypeBadge from '../../../components/RoomTypeBadge'
import { SearchInput, ConfirmModal, AdminTable, StatusBadge, ROOM_STATUS_CONFIG } from '../../../components/admin'
import { ROUTES } from '../../../router/paths'
import { roomApi } from '../../../api/room.api'
import { getErrorMessage } from '../../../api/errorMessage'
import type { Room } from '../../../api/types'

export default function AdminRoomListPage() {
  const { t } = useTranslation('admin')
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    roomApi
      .adminList({ page: 1, limit: 100, search: search || undefined })
      .then((res) => setRooms(res.items))
      .catch((err) => setError(getErrorMessage(err, t('common.notFoundGeneric'))))
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-with-loading-flag pattern, xem AdminBookingListPage.tsx
  useEffect(load, [search, t])

  const handleDelete = async (id: string) => {
    await roomApi.remove(id)
    setRooms((prev) => prev.filter((r) => r.id !== id))
    setShowDeleteModal(null)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('rooms.list.eyebrow')}
        title={t('rooms.list.title')}
        subtitle={t('rooms.list.subtitle', { count: rooms.length })}
        action={
          <div className="flex gap-2">
            <button className="px-3 py-2 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
              {t('rooms.list.exportCsv')} 
            </button>
            <Link to={ROUTES.ADMIN.ROOM_NEW} className="px-4 py-2 text-xs font-semibold text-white bg-navy rounded-lg hover:opacity-90 transition-opacity">
              {t('rooms.list.addRoom')}
            </Link>
          </div>
        }
      />

      <Card>
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <SearchInput value={search} onChange={setSearch} placeholder={t('rooms.list.searchPlaceholder')} className="flex-1 max-w-xs" />
        </div>

        {loading ? (
          <PageLoader fullPage={false} />
        ) : error ? (
          <p className="p-6 text-danger text-sm">{error}</p>
        ) : (
          <AdminTable
            rowKey={(r: Room) => r.id}
            rows={rooms}
            columns={[
              {
                key: 'room',
                header: t('rooms.list.columnRoom'),
                render: (room) => {
                  const thumb = room.images?.find((i) => i.isThumbnail)?.imageUrl ?? room.images?.[0]?.imageUrl
                  return (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-9 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                        {thumb && <img src={thumb} alt={room.name} className="w-full h-full object-cover" />}
                      </div>
                      <span className="font-medium text-navy whitespace-nowrap">{room.name}</span>
                    </div>
                  )
                },
              },
              { key: 'type', header: t('rooms.list.columnType'), render: (room) => <RoomTypeBadge type={room.roomType} /> },
              {
                key: 'price',
                header: t('rooms.list.columnPrice'),
                render: (room) => (
                  <>
                    <span className="font-semibold text-navy">${room.pricePerNight}</span>
                    <span className="text-xs text-slate-400 font-normal">/night</span>
                  </>
                ),
              },
              { key: 'capacity', header: t('rooms.list.columnCapacity'), render: (room) => room.capacity },
              { key: 'status', header: t('common.status'), render: (room) => <StatusBadge status={room.status} config={ROOM_STATUS_CONFIG} /> },
              {
                key: 'actions',
                header: t('common.actions'),
                render: (room) => (
                  <div className="flex gap-1.5">
                    <button onClick={() => navigate(ROUTES.ADMIN.ROOM_DETAIL(room.id))} className="px-2.5 py-1 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">{t('common.view')}</button>
                    <button onClick={() => navigate(ROUTES.ADMIN.ROOM_EDIT(room.id))} className="px-2.5 py-1 text-xs font-semibold text-navy border border-navy/30 rounded-lg hover:bg-navy hover:text-white transition-colors">{t('common.edit')}</button>
                    <button onClick={() => setShowDeleteModal(room.id)} className="px-2.5 py-1 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">{t('common.delete')}</button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <ConfirmModal
        open={!!showDeleteModal}
        title={t('rooms.list.deleteTitle')}
        desc={t('rooms.list.deleteDesc')}
        confirmLabel={t('rooms.list.deleteConfirm')}
        onConfirm={() => handleDelete(showDeleteModal!)}
        onCancel={() => setShowDeleteModal(null)}
      />
    </div>
  )
}
