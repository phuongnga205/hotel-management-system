import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PATHS } from '../../../routes/paths'
import { inputBase, FieldLabel, PageHeader, Card, Spinner } from '../../../components/ui'
import { Breadcrumb } from '../../../components/admin'
import Dropdown from '../../../components/Dropdown'

export default function AdminRoomCreatePage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [roomType, setRoomType] = useState('DELUXE')
  const [price, setPrice] = useState('')
  const [floor, setFloor] = useState('')
  const [area, setArea] = useState('')
  const [maxGuests, setMaxGuests] = useState('2')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 900))
    setLoading(false)
    navigate(PATHS.ADMIN.ROOMS)
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <Breadcrumb items={[{ label: 'Rooms', to: PATHS.ADMIN.ROOMS }, { label: 'New Room' }]} />

      <PageHeader eyebrow="Inventory" title="Create Room" />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-navy text-sm uppercase tracking-wide">Room Information</h2>

          <div>
            <FieldLabel>Room name</FieldLabel>
            <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputBase} border-slate-200`} placeholder="e.g. Grand Deluxe King" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Room type</FieldLabel>
              <Dropdown value={roomType} onChange={setRoomType} options={['SINGLE', 'DOUBLE', 'DELUXE', 'SUITE', 'PENTHOUSE'].map((t) => ({ value: t, label: t.charAt(0) + t.slice(1).toLowerCase() }))} />
            </div>
            <div>
              <FieldLabel>Price per night ($)</FieldLabel>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={`${inputBase} border-slate-200`} placeholder="320" required min="1" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <FieldLabel>Floor</FieldLabel>
              <input type="number" value={floor} onChange={(e) => setFloor(e.target.value)} className={`${inputBase} border-slate-200`} placeholder="8" required />
            </div>
            <div>
              <FieldLabel>Area (m²)</FieldLabel>
              <input type="number" value={area} onChange={(e) => setArea(e.target.value)} className={`${inputBase} border-slate-200`} placeholder="40" required />
            </div>
            <div>
              <FieldLabel>Max Guests</FieldLabel>
              <Dropdown value={maxGuests} onChange={setMaxGuests} options={[1,2,3,4,5,6].map((n) => ({ value: String(n), label: `${n} guest${n > 1 ? 's' : ''}` }))} />
            </div>
          </div>

          <div>
            <FieldLabel>Description</FieldLabel>
            <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputBase} border-slate-200 resize-none`} placeholder="Describe the room..." />
          </div>
        </Card>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-navy rounded-lg hover:opacity-90 disabled:opacity-70 flex items-center gap-2 transition-opacity"
          >
            {loading ? <><Spinner />Creating…</> : 'Create Room'}
          </button>
          <Link to={PATHS.ADMIN.ROOMS} className="px-6 py-2.5 text-sm font-semibold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
