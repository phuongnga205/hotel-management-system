import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MY_BOOKINGS } from '../../../data/mock'
import { BookingStatusBadge, Card, PageHeader } from '../../../components/ui'
import { Breadcrumb, StatusBadge, USER_STATUS_CONFIG } from '../../../components/admin'
import DetailGrid from '../../../components/DetailGrid'
import RoleBadge from '../../../components/RoleBadge'
import { PATHS } from '../../../routes/paths'

const USERS: Record<string, { id: string; name: string; email: string; phone: string; role: string; status: 'ACTIVE' | 'INACTIVE'; bookings: number; joined: string }> = {
  u1: { id: 'u1', name: 'Alex Johnson', email: 'alex.johnson@email.com', phone: '+1 (555) 234-5678', role: 'user', status: 'ACTIVE', bookings: 4, joined: '2025-03-15' },
  u2: { id: 'u2', name: 'Isabella Romano', email: 'i.romano@mail.com', phone: '+39 02 1234 5678', role: 'user', status: 'ACTIVE', bookings: 2, joined: '2025-06-22' },
}

export default function AdminUserDetailPage() {
  const { userId } = useParams()
  const user = USERS[userId ?? ''] ?? { id: userId ?? '', name: 'Unknown User', email: '-', phone: '-', role: 'user', status: 'ACTIVE' as const, bookings: 0, joined: '2025-01-01' }
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>(user.status)
  const userBookings = MY_BOOKINGS.filter((b) => b.guestEmail === user.email)

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Users', to: PATHS.ADMIN.USERS }, { label: user.name }]} />
      <PageHeader eyebrow="Management" title={user.name} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* User info */}
        <Card className="p-5">
          <div className="text-center mb-5">
            <div className="w-16 h-16 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-2xl mx-auto mb-3">{user.name[0]}</div>
            <h2 className="font-bold text-navy text-lg">{user.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
            <div className="mt-2">
              <StatusBadge status={status} config={USER_STATUS_CONFIG} />
            </div>
          </div>

          <DetailGrid
            cols={2}
            className="mb-5"
            items={[
              { label: 'Phone', value: user.phone },
              { label: 'Role', value: <RoleBadge role={user.role} /> },
              { label: 'Joined', value: new Date(user.joined).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
              { label: 'Total Bookings', value: String(user.bookings) },
            ]}
          />

          <div className="flex gap-2">
            <button
              onClick={() => setStatus(status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                status === 'ACTIVE'
                  ? 'border border-red-300 text-red-600 hover:bg-red-50'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}
            >
              {status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </Card>

        {/* Booking history */}
        <Card className="lg:col-span-2">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-semibold text-navy text-sm">Booking History</h3>
            <p className="text-xs text-slate-400 mt-0.5">{userBookings.length} booking{userBookings.length !== 1 ? 's' : ''}</p>
          </div>
          {userBookings.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">No bookings found for this user.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    {['Booking ID', 'Room', 'Check-in', 'Nights', 'Total', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {userBookings.map((b) => (
                    <tr key={b.id} className="border-b border-slate-50 hover:bg-surface transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-navy">#{b.id}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{b.roomName}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{new Date(b.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td className="px-4 py-3 text-slate-600">{b.nights}</td>
                      <td className="px-4 py-3 font-semibold text-navy">${b.totalPrice.toLocaleString()}</td>
                      <td className="px-4 py-3"><BookingStatusBadge status={b.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
