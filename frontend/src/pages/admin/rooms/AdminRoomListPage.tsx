import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import PageHeader from '../../../components/PageHeader'
import Card from '../../../components/Card'
import Pagination from '../../../components/Pagination'
import { PageLoader } from '../../../components/common/PageLoader'
import RoomTypeBadge from '../../../components/RoomTypeBadge'
import Dropdown from '../../../components/Dropdown'
import inputBase from '../../../components/inputBase'
import { SearchInput, ConfirmModal, AdminTable, StatusBadge, ROOM_STATUS_CONFIG } from '../../../components/admin'
import { ROUTES } from '../../../router/paths'
import { roomApi } from '../../../api/room.api'
import { getErrorMessage } from '../../../api/errorMessage'
import type { Room, RoomSortBy, RoomStatus, SortOrder } from '../../../api/types'

const PER_PAGE = 10

// Nut mui ten len/xuong canh ten cot (Price/Capacity) - bam 1 chieu se dat
// cot do lam tieu chi sap xep chinh (sortBy) theo dung chieu vua bam, khac
// dropdown "Newest/Oldest" (luon sap theo createdAt). Chi 1 tieu chi sap xep
// duoc ap dung cung luc, dropdown thoi gian tu dong "active" lai khi doi ve
// sortBy createdAt.
function SortableColumnHeader({
  label,
  active,
  direction,
  onSort,
}: {
  label: string
  active: boolean
  direction: SortOrder
  onSort: (direction: SortOrder) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span>{label}</span>
      <div className="flex flex-col leading-none">
        <button
          type="button"
          onClick={() => onSort('ASC')}
          aria-label={`Sort ${label} ascending`}
          className={`text-[9px] leading-none transition-colors ${active && direction === 'ASC' ? 'text-navy' : 'text-slate-300 hover:text-slate-400'}`}
        >
          ▲
        </button>
        <button
          type="button"
          onClick={() => onSort('DESC')}
          aria-label={`Sort ${label} descending`}
          className={`text-[9px] leading-none -mt-0.5 transition-colors ${active && direction === 'DESC' ? 'text-navy' : 'text-slate-300 hover:text-slate-400'}`}
        >
          ▼
        </button>
      </div>
    </div>
  )
}

export default function AdminRoomListPage() {
  const { t } = useTranslation('admin')
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [roomType, setRoomType] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | RoomStatus>('ALL')
  const [sortBy, setSortBy] = useState<RoomSortBy>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC')
  const [page, setPage] = useState(1)
  const [rooms, setRooms] = useState<Room[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const load = () => {
    setLoading(true)
    roomApi
      .adminList({
        page,
        limit: PER_PAGE,
        search: search || undefined,
        roomType: roomType || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        sortBy,
        sortOrder,
      })
      .then((res) => { setRooms(res.items); setTotal(res.total) })
      .catch((err) => setError(getErrorMessage(err, t('common.notFoundGeneric'))))
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-with-loading-flag pattern, xem AdminBookingListPage.tsx
  useEffect(load, [page, search, roomType, statusFilter, sortBy, sortOrder, t])

  const timeSortOptions = [
    { value: 'DESC', label: t('common.sortNewest') },
    { value: 'ASC', label: t('common.sortOldest') },
  ]
  const statusOptions = [
    { value: 'ALL', label: t('bookings.list.statusAll') },
    { value: 'ACTIVE', label: t('status.room.ACTIVE') },
    { value: 'INACTIVE', label: t('status.room.INACTIVE') },
    { value: 'MAINTENANCE', label: t('status.room.MAINTENANCE') },
  ]

  const handleColumnSort = (column: RoomSortBy, direction: SortOrder) => {
    setSortBy(column)
    setSortOrder(direction)
    setPage(1)
  }

  const handleDelete = async (id: string) => {
    try {
      await roomApi.remove(id)
      setShowDeleteModal(null)
      load()
    } catch (err) {
      // Truoc day khong catch - BE tra 409 (phong con booking PENDING/
      // ACCEPTED) roi nem thang ra ngoai, modal dung im khong dong, khong
      // co toast nao bao loi ca. ConfirmModal.onConfirm la `() => void`,
      // khong tu bat loi tu promise no goi.
      toast.error(getErrorMessage(err, t('common.notFoundGeneric')))
    }
  }

  // Nut nay truoc day khong co onClick, khong tai duoc gi ca. BE tra ve file
  // .xlsx nhi phan (khong phai .csv du label la "Export CSV") - tao 1 the <a>
  // tam de trinh duyet tai xuong roi don ngay, khong can render gi them.
  const handleExport = async () => {
    try {
      setExporting(true)
      const blob = await roomApi.exportToExcel()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'rooms.xlsx'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.notFoundGeneric')))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('rooms.list.eyebrow')}
        title={t('rooms.list.title')}
        subtitle={t('rooms.list.subtitle', { count: total })}
        action={
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-3 py-2 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {exporting ? t('common:common.loading') : t('rooms.list.exportCsv')}
            </button>
            <Link to={ROUTES.ADMIN.ROOM_NEW} className="px-4 py-2 text-xs font-semibold text-white bg-navy rounded-lg hover:opacity-90 transition-opacity">
              {t('rooms.list.addRoom')}
            </Link>
          </div>
        }
      />

      <Card>
        <div className="grid grid-cols-[3fr_3fr_2fr_2fr] gap-2 p-4 border-b border-slate-100">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder={t('rooms.list.searchPlaceholder')} className="min-w-0" />
          <input
            value={roomType}
            onChange={(e) => { setRoomType(e.target.value); setPage(1) }}
            placeholder={t('rooms.list.typeFilterPlaceholder')}
            className={`${inputBase} border-slate-200 min-w-0`}
          />
          <Dropdown value={statusFilter} onChange={(v) => { setStatusFilter(v as 'ALL' | RoomStatus); setPage(1) }} options={statusOptions} size="sm" className="min-w-0" />
          <Dropdown
            value={sortBy === 'createdAt' ? sortOrder : ''}
            onChange={(v) => { setSortBy('createdAt'); setSortOrder(v as SortOrder); setPage(1) }}
            options={timeSortOptions}
            placeholder={t('rooms.list.sortByColumn')}
            size="sm"
            className="min-w-0"
          />
        </div>

        {loading ? (
          <PageLoader fullPage={false} />
        ) : error ? (
          <p className="p-6 text-danger text-sm">{error}</p>
        ) : (
          <>
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
                key: 'view',
                header: t('rooms.list.columnView'),
                render: (room) => (room.viewType ? t(`rooms.viewType.${room.viewType}`) : '—'),
              },
              {
                key: 'price',
                header: (
                  <SortableColumnHeader
                    label={t('rooms.list.columnPrice')}
                    active={sortBy === 'price'}
                    direction={sortOrder}
                    onSort={(dir) => handleColumnSort('price', dir)}
                  />
                ),
                render: (room) => (
                  <>
                    <span className="font-semibold text-navy">${Number(room.pricePerNight).toLocaleString()}</span>
                    <span className="text-xs text-slate-400 font-normal">/night</span>
                  </>
                ),
              },
              {
                key: 'capacity',
                header: (
                  <SortableColumnHeader
                    label={t('rooms.list.columnCapacity')}
                    active={sortBy === 'capacity'}
                    direction={sortOrder}
                    onSort={(dir) => handleColumnSort('capacity', dir)}
                  />
                ),
                render: (room) => room.capacity,
              },
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
          <Pagination page={page} total={total} perPage={PER_PAGE} onChange={setPage} />
          </>
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
