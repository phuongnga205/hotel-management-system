import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Dropdown from '../../../components/Dropdown'
import PageHeader from '../../../components/PageHeader'
import Card from '../../../components/Card'
import { PageLoader } from '../../../components/common/PageLoader'
import { AdminTable, StatusBadge, EMAIL_LOG_STATUS_CONFIG } from '../../../components/admin'
import { ROUTES } from '../../../router/paths'
import { emailLogApi } from '../../../api/email-log.api'
import { getErrorMessage } from '../../../api/errorMessage'
import type { EmailLog, EmailStatus } from '../../../api/types'

const STATUS_DOTS: Record<string, string> = { ALL: 'bg-slate-300', PENDING: 'bg-amber-400', SENT: 'bg-emerald-400', FAILED: 'bg-red-400' }

export default function AdminEmailLogListPage() {
  const { t, i18n } = useTranslation('admin')
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-with-loading-flag pattern, xem AdminBookingListPage.tsx
    setLoading(true)
    emailLogApi
      .list({ page: 1, limit: 100, status: statusFilter === 'ALL' ? undefined : (statusFilter as EmailStatus) })
      .then((res) => setLogs(res.items))
      .catch((err) => setError(getErrorMessage(err, t('common.notFoundGeneric'))))
      .finally(() => setLoading(false))
  }, [statusFilter, t])

  const statusOptions = [
    { value: 'ALL', label: t('emailLogs.list.statusAll') },
    ...(['PENDING', 'SENT', 'FAILED'] as EmailStatus[]).map((s) => ({ value: s, label: t(`status.email.${s}`) })),
  ]

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={t('emailLogs.list.eyebrow')} title={t('emailLogs.list.title')} subtitle={t('emailLogs.list.subtitle', { count: logs.length })} />

      <Card>
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <Dropdown value={statusFilter} onChange={setStatusFilter} options={statusOptions} statusDots={STATUS_DOTS} size="sm" className="w-40" />
          <span className="text-xs text-slate-400 ml-auto">{t('emailLogs.list.resultsCount', { count: logs.length })}</span>
        </div>

        {loading ? (
          <PageLoader fullPage={false} />
        ) : error ? (
          <p className="p-6 text-danger text-sm">{error}</p>
        ) : (
          <AdminTable
            rowKey={(l: EmailLog) => l.id}
            rows={logs}
            columns={[
              { key: 'to', header: t('table.recipient'), render: (l) => <span className="text-navy text-xs font-medium">{l.recipient}</span> },
              { key: 'type', header: t('table.type'), render: (l) => <span className="text-xs bg-surface text-slate-600 px-2 py-0.5 rounded-md">{l.type}</span> },
              { key: 'status', header: t('common.status'), render: (l) => <StatusBadge status={l.status} config={EMAIL_LOG_STATUS_CONFIG} /> },
              {
                key: 'sentAt',
                header: t('table.sentAt'),
                className: 'text-slate-500 text-xs whitespace-nowrap',
                render: (l) => (l.sentAt ? new Date(l.sentAt).toLocaleString(i18n.language, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'),
              },
              { key: 'retries', header: t('table.retries'), render: (l) => l.retryCount },
              {
                key: 'actions',
                header: t('common.actions'),
                render: (l) => (
                  <button onClick={() => navigate(ROUTES.ADMIN.EMAIL_LOG_DETAIL(l.id))} className="px-2.5 py-1 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    {t('common.view')}
                  </button>
                ),
              },
            ]}
          />
        )}
      </Card>
    </div>
  )
}
