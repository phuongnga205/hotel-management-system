import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ROOMS } from '../../../data/mock'
import { PATHS } from '../../../routes/paths'
import { inputBase, FieldLabel, PageHeader, Card, Spinner } from '../../../components/ui'
import { Breadcrumb } from '../../../components/admin'
import Dropdown from '../../../components/Dropdown'

export default function AdminRoomEditPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const room = ROOMS.find((r) => r.id === roomId)

  const [name, setName] = useState(room?.name ?? '')
  const [roomType, setRoomType] = useState(room?.roomType ?? 'DELUXE')
  const [price, setPrice] = useState(String(room?.pricePerNight ?? ''))
  const [floor, setFloor] = useState(String(room?.floor ?? ''))
  const [area, setArea] = useState(String(room?.area ?? ''))
  const [maxGuests, setMaxGuests] = useState(String(room?.maxGuests ?? '2'))
  const [description, setDescription] = useState(room?.description ?? '')
  const [loading, setLoading] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 900))
    setLoading(false)
    navigate(PATHS.ADMIN.ROOM_DETAIL(room.id))
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <Breadcrumb items={[{ label: 'Rooms', to: PATHS.ADMIN.ROOMS }, { label: room.name, to: PATHS.ADMIN.ROOM_DETAIL(room.id) }, { label: 'Edit' }]} />

      <PageHeader eyebrow="Inventory" title="Edit Room" />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-navy text-sm uppercase tracking-wide">Room Information</h2>

          <div>
            <FieldLabel>Room name</FieldLabel>
            <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputBase} border-slate-200`} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Room type</FieldLabel>
              <Dropdown value={roomType} onChange={setRoomType} options={['SINGLE', 'DOUBLE', 'DELUXE', 'SUITE', 'PENTHOUSE'].map((t) => ({ value: t, label: t.charAt(0) + t.slice(1).toLowerCase() }))} />
            </div>
            <div>
              <FieldLabel>Price per night ($)</FieldLabel>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={`${inputBase} border-slate-200`} required min="1" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <FieldLabel>Floor</FieldLabel>
              <input type="number" value={floor} onChange={(e) => setFloor(e.target.value)} className={`${inputBase} border-slate-200`} required />
            </div>
            <div>
              <FieldLabel>Area (m²)</FieldLabel>
              <input type="number" value={area} onChange={(e) => setArea(e.target.value)} className={`${inputBase} border-slate-200`} required />
            </div>
            <div>
              <FieldLabel>Max Guests</FieldLabel>
              <Dropdown value={maxGuests} onChange={setMaxGuests} options={[1,2,3,4,5,6].map((n) => ({ value: String(n), label: `${n} guest${n > 1 ? 's' : ''}` }))} />
            </div>
          </div>

          <div>
            <FieldLabel>Description</FieldLabel>
            <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputBase} border-slate-200 resize-none`} />
          </div>
        </Card>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-navy rounded-lg hover:opacity-90 disabled:opacity-70 flex items-center gap-2 transition-opacity"
          >
            {loading ? <><Spinner />Saving…</> : 'Save Changes'}
          </button>
          <Link to={PATHS.ADMIN.ROOM_DETAIL(room.id)} className="px-6 py-2.5 text-sm font-semibold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
