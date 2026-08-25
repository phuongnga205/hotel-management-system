import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import PageHeader from '../../components/PageHeader'
import DateRangeBar from '../../components/DateRangeBar'
import Pagination from '../../components/Pagination'
import EmptyState from '../../components/EmptyState'
import Card from '../../components/Card'
import FieldLabel from '../../components/FieldLabel'
import inputBase from '../../components/inputBase'
import { RoomGridCard, RoomListCard, RoomCardSkeleton } from '../../components/RoomCard'
import { AmenityCheckboxGroup } from '../../components/admin/AmenityCheckboxGroup'
import { roomApi } from '../../api/room.api'
import { amenityApi } from '../../api/amenity.api'
import { getErrorMessage } from '../../api/errorMessage'
import { ROUTES } from '../../router/paths'
import type { Amenity, Room, RoomViewType } from '../../api/types'

const PER_PAGE = 9
const VIEW_TYPES: RoomViewType[] = ['CITY_VIEW', 'GARDEN_VIEW', 'SEA_VIEW']
// roomType/viewType chua co param filter phia server (xem comment o duoi) -
// phai tu lam tron ca tap ket qua tren FE roi tu phan trang lai, nen phai
// xin het (limit toi da BE cho phep) thay vi chi 1 trang PER_PAGE=9 nhu cu.
// Neu khong, checkbox loc chi con tac dung tren dung 9 phong dang hien thi,
// khien hau het cac phong khop dieu kien loc (nhung nam o "trang" khac) bien
// mat kho hieu - day chinh la loi "filter khong hoat dong" nguoi dung gap.
const FETCH_ALL_LIMIT = 100

export default function RoomListPage() {
  const { t } = useTranslation('rooms')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const checkIn = searchParams.get('checkIn') ?? ''
  const checkOut = searchParams.get('checkOut') ?? ''
  const guests = searchParams.get('guests') ?? ''
  const isAvailabilitySearch = !!checkIn && !!checkOut

  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  // Chi thuc su gui len server khi dang o che do listAvailable - ListRoomsQuery
  // (listPublic) khong nhan cac field nay (xem api/types.ts).
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>([])
  const [amenityCatalog, setAmenityCatalog] = useState<Amenity[]>([])

  // roomType/viewType chua co param filter phia server (xem FETCH_ALL_LIMIT)
  // - loc client-side, danh sach lua chon lay dong bang distinct tu toan bo
  // `rooms` da xin ve, khong hardcode 1 tap co dinh.
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([])
  const [selectedViewTypes, setSelectedViewTypes] = useState<RoomViewType[]>([])

  useEffect(() => {
    amenityApi.list().then(setAmenityCatalog).catch(() => {})
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1)
  }, [checkIn, checkOut, guests, minPrice, maxPrice, selectedAmenityIds, selectedRoomTypes, selectedViewTypes])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    const guestsNum = guests ? Number(guests) : undefined
    // Luon xin FETCH_ALL_LIMIT (khong dung PER_PAGE/`page`) - roomType/
    // viewType duoc loc client-side ben duoi nen phai co san toan bo tap ket
    // qua truoc khi tu phan trang lai, xem comment o FETCH_ALL_LIMIT.
    const promise = isAvailabilitySearch
      ? roomApi.listAvailable({
          checkIn,
          checkOut,
          guests: guestsNum,
          page: 1,
          limit: FETCH_ALL_LIMIT,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          amenities: selectedAmenityIds.length > 0 ? amenityNamesFrom(selectedAmenityIds, amenityCatalog) : undefined,
        })
      : roomApi.listPublic({ guests: guestsNum, page: 1, limit: FETCH_ALL_LIMIT })

    promise
      .then((res) => {
        setRooms(res.items)
      })
      .catch((err) => toast.error(getErrorMessage(err, t('list.fetchError'))))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkIn, checkOut, guests, isAvailabilitySearch, minPrice, maxPrice, selectedAmenityIds, amenityCatalog])

  const distinctRoomTypes = useMemo(() => Array.from(new Set(rooms.map((r) => r.roomType))).sort(), [rooms])
  const distinctViewTypes = useMemo(
    () => VIEW_TYPES.filter((v) => rooms.some((r) => r.viewType === v)),
    [rooms],
  )

  // roomType/viewType khong co param loc phia server (xem comment o
  // FETCH_ALL_LIMIT) nen loc tren toan bo `rooms` da xin ve, roi tu phan
  // trang lai ket qua da loc (khac `total` tu server - so do khong phan anh
  // dung so luong sau khi loc client-side).
  const visibleRooms = useMemo(
    () =>
      rooms.filter((r) => {
        if (selectedRoomTypes.length > 0 && !selectedRoomTypes.includes(r.roomType)) return false
        if (selectedViewTypes.length > 0 && (!r.viewType || !selectedViewTypes.includes(r.viewType))) return false
        return true
      }),
    [rooms, selectedRoomTypes, selectedViewTypes],
  )
  const pagedRooms = useMemo(
    () => visibleRooms.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [visibleRooms, page],
  )

  const handleSearch = (nextCheckIn: string, nextCheckOut: string, nextGuests: string) => {
    const q = new URLSearchParams()
    if (nextCheckIn) q.set('checkIn', nextCheckIn)
    if (nextCheckOut) q.set('checkOut', nextCheckOut)
    if (nextGuests) q.set('guests', nextGuests)
    setSearchParams(q)
  }

  const currentQueryString = () => {
    const q = new URLSearchParams()
    if (checkIn) q.set('checkIn', checkIn)
    if (checkOut) q.set('checkOut', checkOut)
    if (guests) q.set('guests', guests)
    const qs = q.toString()
    return qs ? `?${qs}` : ''
  }

  const goToDetail = (roomId: string) => navigate(`${ROUTES.ROOM_DETAIL(roomId)}${currentQueryString()}`)
  const goToBook = (roomId: string) => navigate(`${ROUTES.BOOK_ROOM(roomId)}${currentQueryString()}`)

  const toggleRoomType = (value: string) => {
    setSelectedRoomTypes((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }
  const toggleViewType = (value: RoomViewType) => {
    setSelectedViewTypes((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }
  const resetFilters = () => {
    setMinPrice('')
    setMaxPrice('')
    setSelectedAmenityIds([])
    setSelectedRoomTypes([])
    setSelectedViewTypes([])
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 min-h-screen">
      <PageHeader
        eyebrow={t('list.eyebrow')}
        title={t('list.title')}
        subtitle={isAvailabilitySearch ? t('list.subtitleSearch') : t('list.subtitleAll')}
      />

      <DateRangeBar
        checkIn={checkIn}
        checkOut={checkOut}
        guests={guests || '1'}
        onCheckInChange={(v) => handleSearch(v, checkOut, guests)}
        onCheckOutChange={(v) => handleSearch(checkIn, v, guests)}
        onGuestsChange={(v) => handleSearch(checkIn, checkOut, v)}
        onSearch={() => handleSearch(checkIn, checkOut, guests)}
        className="mb-8"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters sidebar */}
        <Card className="p-5 h-fit lg:sticky lg:top-24">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-navy text-sm">{t('list.filters.title')}</h3>
            <button onClick={resetFilters} className="text-xs text-navy/60 hover:text-navy font-medium">
              {t('list.filters.reset')}
            </button>
          </div>

          <div className={`mb-5 ${isAvailabilitySearch ? '' : 'opacity-40 pointer-events-none'}`}>
            <FieldLabel>{t('list.filters.priceRange')}</FieldLabel>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder={t('list.filters.minPrice')}
                className={inputBase}
              />
              <span className="text-slate-300">–</span>
              <input
                type="number"
                min={0}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder={t('list.filters.maxPrice')}
                className={inputBase}
              />
            </div>
            {!isAvailabilitySearch && <p className="text-xs text-slate-400 mt-1.5">{t('list.filters.amenitiesHint')}</p>}
          </div>

          <div className={`mb-5 ${isAvailabilitySearch ? '' : 'opacity-40 pointer-events-none'}`}>
            <FieldLabel>{t('list.filters.amenities')}</FieldLabel>
            <AmenityCheckboxGroup
              amenities={amenityCatalog}
              selectedIds={selectedAmenityIds}
              onToggle={(id) => setSelectedAmenityIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))}
              emptyLabel=""
            />
          </div>

          {distinctRoomTypes.length > 0 && (
            <div className="mb-5">
              <FieldLabel>{t('list.filters.roomType')}</FieldLabel>
              <div className="flex flex-col gap-1.5">
                {distinctRoomTypes.map((type) => (
                  <label key={type} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={selectedRoomTypes.includes(type)} onChange={() => toggleRoomType(type)} />
                    {type}
                  </label>
                ))}
              </div>
            </div>
          )}

          {distinctViewTypes.length > 0 && (
            <div>
              <FieldLabel>{t('list.filters.viewType')}</FieldLabel>
              <div className="flex flex-col gap-1.5">
                {distinctViewTypes.map((view) => (
                  <label key={view} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={selectedViewTypes.includes(view)} onChange={() => toggleViewType(view)} />
                    {t(`list.viewTypeLabel.${view}`)}
                  </label>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Results */}
        <div className="lg:col-span-3">
          <div className="flex justify-end mb-4">
            <div className="flex gap-1 bg-white border border-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'grid' ? 'bg-navy text-white' : 'text-slate-500'}`}
              >
                {t('list.viewGrid')}
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'list' ? 'bg-navy text-white' : 'text-slate-500'}`}
              >
                {t('list.viewList')}
              </button>
            </div>
          </div>

          {loading ? (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'flex flex-col gap-4'}>
              {Array.from({ length: 4 }).map((_, i) => <RoomCardSkeleton key={i} />)}
            </div>
          ) : visibleRooms.length === 0 ? (
            <EmptyState icon="🛏️" title={t('list.empty')} desc={t('list.emptyDesc')} />
          ) : (
            <>
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'flex flex-col gap-4'}>
                {pagedRooms.map((room) =>
                  viewMode === 'grid' ? (
                    <RoomGridCard key={room.id} room={room} onView={() => goToDetail(room.id)} onBook={() => goToBook(room.id)} />
                  ) : (
                    <RoomListCard key={room.id} room={room} onView={() => goToDetail(room.id)} onBook={() => goToBook(room.id)} />
                  ),
                )}
              </div>
              <Card className="mt-4">
                <Pagination page={page} total={visibleRooms.length} perPage={PER_PAGE} onChange={setPage} />
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function amenityNamesFrom(ids: string[], catalog: Amenity[]): string[] {
  return catalog.filter((a) => ids.includes(a.id)).map((a) => a.name)
}
