import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, Card } from '../../../components/ui'
import { SearchInput, StatusBadge, USER_STATUS_CONFIG } from '../../../components/admin'
import TabBar from '../../../components/TabBar'
import RoleBadge from '../../../components/RoleBadge'
import { PATHS } from '../../../routes/paths'

const USERS = [
  { id: 'u1', name: 'Alex Johnson', email: 'alex.johnson@email.com', phone: '+1 (555) 234-5678', role: 'user', status: 'ACTIVE', bookings: 4, joined: '2025-03-15' },
  { id: 'u2', name: 'Isabella Romano', email: 'i.romano@mail.com', phone: '+39 02 1234 5678', role: 'user', status: 'ACTIVE', bookings: 2, joined: '2025-06-22' },
  { id: 'u3', name: 'Marcus Chen', email: 'mchen@corp.com', phone: '+65 9123 4567', role: 'user', status: 'ACTIVE', bookings: 3, joined: '2025-01-08' },
  { id: 'u4', name: 'Sophie Laurent', email: 'slaurent@fr.com', phone: '+33 1 2345 6789', role: 'user', status: 'INACTIVE', bookings: 1, joined: '2024-11-30' },
  { id: 'u5', name: 'James Whitfield', email: 'j.whitfield@email.com', phone: '+44 20 7946 0958', role: 'user', status: 'ACTIVE', bookings: 5, joined: '2024-09-14' },
  { id: 'admin1', name: 'Hotel Admin', email: 'admin@grandeur.com', phone: '+1 (800) 555-0001', role: 'admin', status: 'ACTIVE', bookings: 0, joined: '2023-01-01' },
]

export default function AdminUserListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const filtered = USERS.filter((u) => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'ALL' || u.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Management" title="Users" subtitle={`${USERS.length} registered accounts`} />

      <Card>
        {/* Toolbar */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <SearchInput value={search} onChange={setSearch} placeholder="Search users..." className="flex-1 max-w-xs" />
          <TabBar
            tabs={[
              { key: 'ALL', label: 'All' },
              { key: 'ACTIVE', label: 'Active' },
              { key: 'INACTIVE', label: 'Inactive' },
            ]}
            active={statusFilter}
            onChange={setStatusFilter}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                {['User', 'Email', 'Phone', 'Role', 'Bookings', 'Status', 'Joined', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user, i) => (
                <tr key={user.id} className={`border-b border-slate-50 hover:bg-surface transition-colors ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-xs shrink-0">{user.name[0]}</div>
                      <span className="font-medium text-navy whitespace-nowrap">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{user.phone}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.bookings}</td>
                  <td className="px-4 py-3"><StatusBadge status={user.status} config={USER_STATUS_CONFIG} /></td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{new Date(user.joined).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(PATHS.ADMIN.USER_DETAIL(user.id))} className="px-2.5 py-1 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center px-4 py-3 border-t border-slate-100">
          <span className="text-xs text-slate-400">Showing {filtered.length} of {USERS.length} users</span>
        </div>
      </Card>
    </div>
  )
}
