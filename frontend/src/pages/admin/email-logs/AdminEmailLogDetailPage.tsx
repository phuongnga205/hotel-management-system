import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import PageHeader from '../../../components/PageHeader'
import Card from '../../../components/Card'
import { PageLoader } from '../../../components/common/PageLoader'
import { Breadcrumb, StatusBadge, EMAIL_LOG_STATUS_CONFIG } from '../../../components/admin'
import { ROUTES } from '../../../router/paths'
import { emailLogApi } from '../../../api/email-log.api'
import { getErrorMessage } from '../../../api/errorMessage'
import type { EmailLog } from '../../../api/types'

export default function AdminEmailLogDetailPage() {
  const { t, i18n } = useTranslation('admin')
  const { logId } = useParams()
  const [log, setLog] = useState<EmailLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)

  const load = () => {
    if (!logId) return
    setLoading(true)
    emailLogApi.getById(logId).then(setLog).catch(() => setLog(null)).finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-with-loading-flag pattern, xem AdminBookingListPage.tsx
  useEffect(load, [logId])

  if (loading) return <PageLoader />

  if (!log) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">{t('emailLogs.detail.notFound')}</p>
          <Link to={ROUTES.ADMIN.EMAIL_LOGS} className="text-navy font-semibold hover:text-gold">{t('emailLogs.detail.backToList')}</Link>
        </div>
      </div>
    )
  }

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString(i18n.language, { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  const handleRetry = async () => {
    setRetrying(true)
    try {
      await emailLogApi.retry(log.id)
      load()
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.notFoundGeneric')))
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <Breadcrumb items={[{ label: t('emailLogs.list.title'), to: ROUTES.ADMIN.EMAIL_LOGS }, { label: log.id }]} />

      <PageHeader eyebrow={t('emailLogs.list.eyebrow')} title={t('emailLogs.list.title')} action={<StatusBadge status={log.status} config={EMAIL_LOG_STATUS_CONFIG} />} />

      <Card className="p-5">
        <h3 className="font-semibold text-navy text-sm uppercase tracking-wide mb-4">{t('emailLogs.detail.metadataTitle')}</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            { label: t('emailLogs.detail.fieldLogId'), val: log.id },
            { label: t('emailLogs.detail.fieldType'), val: log.type },
            { label: t('emailLogs.detail.fieldTo'), val: log.recipient },
            { label: t('emailLogs.detail.fieldCreatedAt'), val: fmtDate(log.createdAt) },
            { label: t('emailLogs.detail.fieldSentAt'), val: fmtDate(log.sentAt) },
            { label: t('emailLogs.detail.fieldRetryAttempts'), val: String(log.retryCount) },
          ].map(({ label, val }) => (
            <div key={label}>
              <div className="text-xs text-slate-400 mb-0.5">{label}</div>
              <div className="font-medium text-navy break-all">{val}</div>
            </div>
          ))}
        </div>
      </Card>

      {log.status === 'FAILED' && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
          <p className="text-red-700 text-sm font-medium mb-3">
            {t('emailLogs.detail.failedMessage', { count: log.retryCount })}
            {log.lastError && <span className="block mt-1 text-red-500 text-xs">{log.lastError}</span>}
          </p>
          <button onClick={handleRetry} disabled={retrying} className="flex items-center gap-2 px-5 py-2.5 bg-navy text-white text-sm font-bold rounded-lg hover:bg-navy/90 transition-colors disabled:opacity-60">
            {retrying ? t('emailLogs.detail.retrying') : t('emailLogs.detail.retryNow')}
          </button>
        </div>
      )}
      {log.status === 'SENT' && log.retryCount > 0 && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-emerald-700 text-sm font-medium">{t('emailLogs.detail.retrySuccess')}</p>
        </div>
      )}
    </div>
  )
}
