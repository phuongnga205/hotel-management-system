import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PATHS } from '../../../routes/paths'
import { PageHeader, Card, Spinner } from '../../../components/ui'
import { Breadcrumb, StatusBadge, EMAIL_LOG_STATUS_CONFIG } from '../../../components/admin'

const EMAIL_LOGS = [
  { id: 'el1', to: 'alex.johnson@email.com', subject: 'Booking Confirmed — Grand Deluxe King', type: 'BookingConfirmed', status: 'SENT', sentAt: '2026-08-18T10:22:00Z', createdAt: '2026-08-18T10:21:45Z', retries: 0, body: '<p>Dear Alex,</p><p>Your booking for <strong>Grand Deluxe King</strong> has been confirmed. Check-in: Aug 20, 2026. Check-out: Aug 23, 2026. Total: $1,350.</p><p>We look forward to welcoming you.</p><p style="color:#888">The Grand Horizon Hotel</p>' },
  { id: 'el2', to: 'i.romano@mail.com', subject: 'Booking Request Received', type: 'BookingPending', status: 'SENT', sentAt: '2026-08-17T16:45:00Z', createdAt: '2026-08-17T16:44:55Z', retries: 0, body: '<p>Dear Isabella,</p><p>We have received your booking request and it is currently under review. You will be notified once it is confirmed.</p>' },
  { id: 'el3', to: 'mchen@corp.com', subject: 'Password Reset Request', type: 'PasswordReset', status: 'FAILED', sentAt: '2026-08-16T09:10:00Z', createdAt: '2026-08-16T09:09:52Z', retries: 2, body: '<p>Hi Marcus,</p><p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="#">Reset my password →</a></p>' },
  { id: 'el4', to: 'slaurent@fr.com', subject: 'Your Review Has Been Removed', type: 'ReviewDeleted', status: 'SENT', sentAt: '2026-08-15T14:30:00Z', createdAt: '2026-08-15T14:29:50Z', retries: 0, body: '<p>Dear Sophie,</p><p>Your review for <strong>Ocean View Suite</strong> has been removed by our moderation team for violating our content policy.</p>' },
  { id: 'el5', to: 'j.whitfield@email.com', subject: 'Account Activation', type: 'ActivateAccount', status: 'PENDING', sentAt: null, createdAt: '2026-08-15T11:00:00Z', retries: 0, body: '<p>Hi James,</p><p>Welcome to Grand Horizon Hotel. Please click the link below to activate your account.</p><p><a href="#">Activate my account →</a></p>' },
  { id: 'el6', to: 'alex.johnson@email.com', subject: 'Booking Cancelled', type: 'BookingCancelled', status: 'FAILED', sentAt: '2026-08-14T08:00:00Z', createdAt: '2026-08-14T07:59:48Z', retries: 3, body: '<p>Dear Alex,</p><p>Your booking #bk005 for the Executive Suite has been successfully cancelled. A refund will be processed within 5-7 business days.</p>' },
]

export default function AdminEmailLogDetailPage() {
  const { logId } = useParams()
  const log = EMAIL_LOGS.find((l) => l.id === logId)
  const [retrying, setRetrying] = useState(false)
  const [retryDone, setRetryDone] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(log?.status)

  if (!log) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Email log not found.</p>
          <Link to={PATHS.ADMIN.EMAIL_LOGS} className="text-navy font-semibold hover:text-gold">← Back to Email Logs</Link>
        </div>
      </div>
    )
  }

  const handleRetry = () => {
    setRetrying(true)
    setTimeout(() => {
      setRetrying(false)
      setRetryDone(true)
      setCurrentStatus('SENT')
    }, 1400)
  }

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div className="space-y-5 max-w-3xl">
      <Breadcrumb items={[{ label: 'Email Logs', to: PATHS.ADMIN.EMAIL_LOGS }, { label: log.id }]} />

      <PageHeader eyebrow="System" title="Email Log" action={<StatusBadge status={currentStatus ?? log.status} config={EMAIL_LOG_STATUS_CONFIG} />} />

      {/* Metadata */}
      <Card className="p-5">
        <h3 className="font-semibold text-navy text-sm uppercase tracking-wide mb-4">Metadata</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            { label: 'Log ID', val: log.id },
            { label: 'Type', val: log.type },
            { label: 'To', val: log.to },
            { label: 'Subject', val: log.subject },
            { label: 'Created At', val: fmtDate(log.createdAt) },
            { label: 'Sent At', val: fmtDate(log.sentAt) },
            { label: 'Retry Attempts', val: String(log.retries) },
            { label: 'Status', val: EMAIL_LOG_STATUS_CONFIG[currentStatus ?? log.status]?.label ?? (currentStatus ?? log.status) },
          ].map(({ label, val }) => (
            <div key={label}>
              <div className="text-xs text-slate-400 mb-0.5">{label}</div>
              <div className="font-medium text-navy break-all">{val}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Email body preview */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email Body Preview</span>
        </div>
        <div className="p-5">
          <div className="mb-3 pb-3 border-b border-slate-100 space-y-1">
            <div className="flex gap-2 text-xs"><span className="text-slate-400 w-12 shrink-0">From:</span><span className="text-slate-600">no-reply@grandhorizonhotel.com</span></div>
            <div className="flex gap-2 text-xs"><span className="text-slate-400 w-12 shrink-0">To:</span><span className="text-slate-600">{log.to}</span></div>
            <div className="flex gap-2 text-xs"><span className="text-slate-400 w-12 shrink-0">Subject:</span><span className="text-navy font-medium">{log.subject}</span></div>
          </div>
          <div
            className="prose prose-sm max-w-none text-slate-600 [&_a]:text-navy [&_a]:underline [&_strong]:text-navy"
            dangerouslySetInnerHTML={{ __html: log.body }}
          />
        </div>
      </Card>

      {/* Retry action */}
      {log.status === 'FAILED' && (
        <div>
          {retryDone ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-emerald-700 text-sm font-medium">Email successfully resent.</p>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
              <p className="text-red-700 text-sm font-medium mb-3">This email failed to deliver after {log.retries} attempt{log.retries !== 1 ? 's' : ''}. You can retry sending it now.</p>
              <button onClick={handleRetry} disabled={retrying} className="flex items-center gap-2 px-5 py-2.5 bg-navy text-white text-sm font-bold rounded-lg hover:bg-navy/90 transition-colors disabled:opacity-60">
                {retrying ? <><Spinner /><span>Retrying...</span></> : <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry Now
                </>}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
