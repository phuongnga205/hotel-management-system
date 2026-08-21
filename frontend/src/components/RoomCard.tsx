import { useTranslation } from 'react-i18next'
import type { Room } from '../api/types'
import RoomTypeBadge from './RoomTypeBadge'
import AmenityPill from './AmenityPill'

interface RoomCardProps {
  room: Room
  onView: () => void
  onBook: () => void
  variant?: 'grid' | 'list'
}

function thumbnailUrl(room: Room): string | undefined {
  return room.images?.find((img) => img.isThumbnail)?.imageUrl ?? room.images?.[0]?.imageUrl
}

export function RoomGridCard({ room, onView, onBook }: RoomCardProps) {
  const { t } = useTranslation('common')
  const amenities = room.amenities ?? []

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:border-navy hover:ring-2 hover:ring-navy transition-all duration-300 cursor-pointer"
      onClick={onView}
    >
      <div className="relative h-48 overflow-hidden bg-slate-200">
        {thumbnailUrl(room) && <img src={thumbnailUrl(room)} alt={room.name} className="w-full h-full object-cover" />}
        <div className="absolute top-3 left-3">
          <RoomTypeBadge type={room.roomType} />
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-semibold text-navy mb-1 leading-tight">{room.name}</h3>
        {room.description && <p className="text-sm text-slate-500 mb-3 line-clamp-2">{room.description}</p>}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {amenities.slice(0, 4).map((a) => (
            <AmenityPill key={a.id}>{a.name}</AmenityPill>
          ))}
          {amenities.length > 4 && <span className="text-xs text-slate-400">+{amenities.length - 4}</span>}
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div>
            <span className="text-xl font-bold text-navy">${room.pricePerNight}</span>
            <span className="text-xs text-slate-400 ml-1">{t('roomCard.perNight')}</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onBook() }}
            className="px-4 py-2 text-xs font-semibold text-white bg-navy rounded-lg hover:opacity-90 transition-opacity"
          >
            {t('roomCard.bookNow')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function RoomListCard({ room, onView, onBook }: RoomCardProps) {
  const { t } = useTranslation('common')
  const amenities = room.amenities ?? []

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:border-navy hover:ring-2 hover:ring-navy transition-all duration-300 flex cursor-pointer"
      onClick={onView}
    >
      <div className="relative w-56 shrink-0 overflow-hidden bg-slate-200">
        {thumbnailUrl(room) && <img src={thumbnailUrl(room)} alt={room.name} className="w-full h-full object-cover" />}
        <div className="absolute top-3 left-3">
          <RoomTypeBadge type={room.roomType} />
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-navy text-base mb-1">{room.name}</h3>
          {room.description && <p className="text-sm text-slate-500 mb-3">{room.description}</p>}
          <div className="flex flex-wrap gap-1.5">
            {amenities.slice(0, 5).map((a) => (
              <AmenityPill key={a.id}>{a.name}</AmenityPill>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
          <div>
            <span className="text-xl font-bold text-navy">${room.pricePerNight}</span>
            <span className="text-xs text-slate-400 ml-1">
              {t('roomCard.perNight')} · {t('roomCard.upToGuests', { count: room.capacity })}
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onBook() }}
            className="px-5 py-2 text-sm font-semibold text-white bg-navy rounded-lg hover:opacity-90 transition-opacity"
          >
            {t('roomCard.bookNow')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function RoomCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 animate-pulse">
      <div className="h-48 bg-slate-200" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
        <div className="flex gap-2">
          <div className="h-5 bg-slate-100 rounded w-12" />
          <div className="h-5 bg-slate-100 rounded w-14" />
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
          <div className="h-6 bg-slate-200 rounded w-16" />
          <div className="h-8 bg-slate-200 rounded-lg w-20" />
        </div>
      </div>
    </div>
  )
}
