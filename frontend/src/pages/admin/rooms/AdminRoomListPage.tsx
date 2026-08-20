import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROOMS } from '../../../data/mock'
import { RoomTypeBadge, StarRating, PageHeader, Card } from '../../../components/ui'
import { SearchInput, ConfirmModal } from '../../../components/admin'
import { PATHS } from '../../../routes/paths'

export default function AdminRoomListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)
  const [rooms, setRooms] = useState(ROOMS)

  const filtered = rooms.filter((r) =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.roomType.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = (id: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== id))
    setShowDeleteModal(null)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Inventory"
        title="Rooms"
        subtitle={`${rooms.length} rooms in inventory`}
        action={
          <div className="flex gap-2">
            <button className="px-3 py-2 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
              Export CSV 🚧
            </button>
            <Link to={PATHS.ADMIN.ROOM_NEW} className="px-4 py-2 text-xs font-semibold text-white bg-navy rounded-lg hover:opacity-90 transition-opacity">
              + Add Room
            </Link>
          </div>
        }
      />

      <Card>
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <SearchInput value={search} onChange={setSearch} placeholder="Search rooms..." className="flex-1 max-w-xs" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                {['Room', 'Type', 'Floor / Area', 'Price', 'Rating', 'Capacity', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((room, i) => (
                <tr key={room.id} className={`border-b border-slate-50 hover:bg-surface transition-colors ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-9 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                        <img src={room.images[0]} alt={room.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="font-medium text-navy whitespace-nowrap">{room.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><RoomTypeBadge type={room.roomType} /></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">Floor {room.floor} · {room.area}m²</td>
                  <td className="px-4 py-3 font-semibold text-navy">${room.pricePerNight}<span className="text-xs text-slate-400 font-normal">/night</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StarRating rating={room.averageRating} />
                      <span className="text-xs text-slate-500">{room.averageRating.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{room.maxGuests}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => navigate(PATHS.ADMIN.ROOM_DETAIL(room.id))} className="px-2.5 py-1 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">View</button>
                      <button onClick={() => navigate(PATHS.ADMIN.ROOM_EDIT(room.id))} className="px-2.5 py-1 text-xs font-semibold text-navy border border-navy/30 rounded-lg hover:bg-navy hover:text-white transition-colors">Edit</button>
                      <button onClick={() => setShowDeleteModal(room.id)} className="px-2.5 py-1 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmModal
        open={!!showDeleteModal}
        title="Delete Room?"
        desc="This will permanently remove the room and all associated data."
        confirmLabel="Delete Room"
        onConfirm={() => handleDelete(showDeleteModal!)}
        onCancel={() => setShowDeleteModal(null)}
      />
    </div>
  )
}
