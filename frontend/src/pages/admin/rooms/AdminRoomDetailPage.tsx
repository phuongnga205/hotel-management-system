import { Link, useNavigate, useParams } from 'react-router-dom'
import { ROOMS } from '../../../data/mock'
import { RoomTypeBadge, StarRating, PageHeader, Card } from '../../../components/ui'
import { Breadcrumb } from '../../../components/admin'
import { PATHS } from '../../../routes/paths'

export default function AdminRoomDetailPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const room = ROOMS.find((r) => r.id === roomId)

  if (!room) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Room not found.</p>
          <Link to={PATHS.ADMIN.ROOMS} className="text-navy font-semibold hover:text-gold">← Back to Rooms</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Rooms', to: PATHS.ADMIN.ROOMS }, { label: room.name }]} />

      <PageHeader
        title={room.name}
        action={<button onClick={() => navigate(PATHS.ADMIN.ROOM_EDIT(room.id))} className="px-5 py-2.5 text-sm font-semibold text-white bg-navy rounded-lg hover:opacity-90 transition-opacity">Edit Room</button>}
      />
      <div className="flex items-center gap-3 -mt-6 mb-4">
        <RoomTypeBadge type={room.roomType} />
        <div className="flex items-center gap-1.5">
          <StarRating rating={room.averageRating} />
          <span className="text-xs text-slate-500">{room.averageRating.toFixed(1)} ({room.reviewCount} reviews)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Image */}
        <div className="rounded-2xl overflow-hidden h-64 bg-slate-200">
          <img src={room.images[0]} alt={room.name} className="w-full h-full object-cover" />
        </div>

        {/* Details */}
        <Card className="p-5">
          <h3 className="font-semibold text-navy text-sm uppercase tracking-wide mb-4">Room Details</h3>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Price per Night', val: `$${room.pricePerNight}` },
              { label: 'Floor', val: `Floor ${room.floor}` },
              { label: 'Area', val: `${room.area} m²` },
              { label: 'Max Guests', val: `${room.maxGuests} guests` },
              { label: 'Room Type', val: room.roomType },
            ].map(({ label, val }) => (
              <div key={label} className="flex justify-between">
                <span className="text-slate-500">{label}</span>
                <span className="font-medium text-navy">{val}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Amenities</div>
            <div className="flex flex-wrap gap-1.5">
              {room.amenities.map((a) => <span key={a} className="text-xs bg-surface text-slate-600 px-2 py-0.5 rounded-md">{a}</span>)}
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold text-navy text-sm uppercase tracking-wide mb-2">Description</h3>
        <p className="text-slate-600 text-sm leading-relaxed">{room.description}</p>
      </Card>
    </div>
  )
}
