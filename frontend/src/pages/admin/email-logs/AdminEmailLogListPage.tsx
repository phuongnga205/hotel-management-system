import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Dropdown from '../../../components/Dropdown'
import { PATHS } from '../../../routes/paths'
import { PageHeader, Card } from '../../../components/ui'
import { StatusBadge, EMAIL_LOG_STATUS_CONFIG } from '../../../components/admin'

const EMAIL_LOGS = [
  { id: 'el1', to: 'alex.johnson@email.com', subject: 'Booking Confirmed — Grand Deluxe King', type: 'BookingConfirmed', status: 'SENT', sentAt: '2026-08-18T10:22:00Z', retries: 0 },
  { id: 'el2', to: 'i.romano@mail.com', subject: 'Booking Request Received', type: 'BookingPending', status: 'SENT', sentAt: '2026-08-17T16:45:00Z', retries: 0 },
  { id: 'el3', to: 'mchen@corp.com', subject: 'Password Reset Request', type: 'PasswordReset', status: 'FAILED', sentAt: '2026-08-16T09:10:00Z', retries: 2 },
  { id: 'el4', to: 'slaurent@fr.com', subject: 'Your Review Has Been Removed', type: 'ReviewDeleted', status: 'SENT', sentAt: '2026-08-15T14:30:00Z', retries: 0 },
  { id: 'el5', to: 'j.whitfield@email.com', subject: 'Account Activation', type: 'ActivateAccount', status: 'PENDING', sentAt: null, retries: 0 },
  { id: 'el6', to: 'alex.johnson@email.com', subject: 'Booking Cancelled', type: 'BookingCancelled', status: 'FAILED', sentAt: '2026-08-14T08:00:00Z', retries: 3 },
]

export default function AdminEmailLogListPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('ALL')

  const filtered = statusFilter === 'ALL' ? EMAIL_LOGS : EMAIL_LOGS.filter((l) => l.status === statusFilter)

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="System" title="Email Logs" subtitle={EMAIL_LOGS.length + ' email events'} />

      <Card>
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <Dropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'ALL', label: 'All Status' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'SENT', label: 'Sent' },
              { value: 'FAILED', label: 'Failed' },
            ]}
            statusDots={{ ALL: 'bg-slate-300', PENDING: 'bg-amber-400', SENT: 'bg-emerald-400', FAILED: 'bg-red-400' }}
            size="sm"
            className="w-40"
          />
          <span className="text-xs text-slate-400 ml-auto">{filtered.length} results</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                {['Recipient', 'Subject', 'Type', 'Status', 'Sent At', 'Retries', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => (
                <tr key={log.id} className={`border-b border-slate-50 hover:bg-surface transition-colors ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                  <td className="px-4 py-3 text-navy text-xs font-medium">{log.to}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[220px] truncate">{log.subject}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-surface text-slate-600 px-2 py-0.5 rounded-md">{log.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={log.status} config={EMAIL_LOG_STATUS_CONFIG} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {log.sentAt ? new Date(log.sentAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{log.retries}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(PATHS.ADMIN.EMAIL_LOG_DETAIL(log.id))} className="px-2.5 py-1 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
