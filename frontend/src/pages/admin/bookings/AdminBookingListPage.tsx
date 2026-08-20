import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ALL_BOOKINGS } from '../../../data/mock'
import { BookingStatusBadge, PageHeader, Card, Pagination } from '../../../components/ui'
import { SearchInput } from '../../../components/admin'
import Dropdown from '../../../components/Dropdown'
import { PATHS } from '../../../routes/paths'

export default function AdminBookingListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const PER_PAGE = 10

  const filtered = ALL_BOOKINGS.filter((b) => {
    const matchSearch = !search || b.guestName.toLowerCase().includes(search.toLowerCase()) || b.roomName.toLowerCase().includes(search.toLowerCase()) || b.id.includes(search)
    const matchStatus = statusFilter === 'ALL' || b.status === statusFilter
    return matchSearch && matchStatus
  })

  const total = filtered.length
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const pages = Math.max(1, Math.ceil(total / PER_PAGE))

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Operations 🚧" title="Bookings" subtitle={`${ALL_BOOKINGS.length} total bookings · API in progress`} />

      <Card>
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search guest, room..." className="flex-1 max-w-xs" />
          <Dropdown
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1) }}
            options={[
              { value: 'ALL', label: 'All Status' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'ACCEPTED', label: 'Accepted' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
            statusDots={{ ALL: 'bg-slate-300', PENDING: 'bg-amber-400', ACCEPTED: 'bg-emerald-400', REJECTED: 'bg-red-400', CANCELLED: 'bg-slate-400' }}
            size="sm"
            className="w-40"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                {['Booking ID', 'Guest', 'Room', 'Dates', 'Nights', 'Total', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((b, i) => (
                <tr key={b.id} className={`border-b border-slate-50 hover:bg-surface transition-colors ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-navy">#{b.id}</td>
                  <td className="px-4 py-3 font-medium text-navy whitespace-nowrap">{b.guestName}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{b.roomName}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(b.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    <div className="text-slate-400">→ {new Date(b.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{b.nights}</td>
                  <td className="px-4 py-3 font-semibold text-navy">${b.totalPrice.toLocaleString()}</td>
                  <td className="px-4 py-3"><BookingStatusBadge status={b.status} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(PATHS.ADMIN.BOOKING_DETAIL(b.id))} className="px-2.5 py-1 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination page={page} total={total} perPage={PER_PAGE} onChange={setPage} />
      </Card>
    </div>
  )
}
