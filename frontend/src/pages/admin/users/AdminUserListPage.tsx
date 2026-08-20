import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageHeader from '../../../components/PageHeader'
import Card from '../../../components/Card'
import { PageLoader } from '../../../components/common/PageLoader'
import TabBar from '../../../components/TabBar'
import RoleBadge from '../../../components/RoleBadge'
import { SearchInput, AdminTable, StatusBadge, USER_STATUS_CONFIG } from '../../../components/admin'
import { ROUTES } from '../../../router/paths'
import { adminUserApi } from '../../../api/admin-user.api'
import { getErrorMessage } from '../../../api/errorMessage'
import type { AdminUserListItem, UserStatus } from '../../../api/types'

export default function AdminUserListPage() {
  const { t, i18n } = useTranslation('admin')
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | UserStatus>('ALL')
  const [users, setUsers] = useState<AdminUserListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-with-loading-flag pattern, xem AdminBookingListPage.tsx
    setLoading(true)
    adminUserApi
      .list({ page: 1, limit: 100, search: search || undefined, status: statusFilter === 'ALL' ? undefined : statusFilter })
      .then((res) => { setUsers(res.items); setTotal(res.total) })
      .catch((err) => setError(getErrorMessage(err, t('common.notFoundGeneric'))))
      .finally(() => setLoading(false))
  }, [search, statusFilter, t])

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={t('users.list.eyebrow')} title={t('users.list.title')} subtitle={t('users.list.subtitle', { count: total })} />

      <Card>
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <SearchInput value={search} onChange={setSearch} placeholder={t('users.list.searchPlaceholder')} className="flex-1 max-w-xs" />
          <TabBar
            tabs={[
              { key: 'ALL', label: t('users.list.tabAll') },
              { key: 'ACTIVE', label: t('users.list.tabActive') },
              { key: 'INACTIVE', label: t('users.list.tabInactive') },
            ]}
            active={statusFilter}
            onChange={(k) => setStatusFilter(k as 'ALL' | UserStatus)}
          />
        </div>

        {loading ? (
          <PageLoader fullPage={false} />
        ) : error ? (
          <p className="p-6 text-danger text-sm">{error}</p>
        ) : (
          <>
            <AdminTable
              rowKey={(u: AdminUserListItem) => u.id}
              rows={users}
              columns={[
                {
                  key: 'user',
                  header: t('table.user'),
                  render: (u) => (
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-xs shrink-0">
                        {(u.fullName ?? u.username)[0]}
                      </div>
                      <span className="font-medium text-navy whitespace-nowrap">{u.fullName ?? u.username}</span>
                    </div>
                  ),
                },
                { key: 'email', header: t('table.email'), render: (u) => u.email },
                { key: 'phone', header: t('table.phone'), render: (u) => u.phone ?? '—' },
                { key: 'role', header: t('table.role'), render: (u) => <RoleBadge role={u.role} /> },
                { key: 'status', header: t('common.status'), render: (u) => <StatusBadge status={u.status} config={USER_STATUS_CONFIG} /> },
                {
                  key: 'joined',
                  header: t('table.joined'),
                  className: 'text-slate-500 text-xs whitespace-nowrap',
                  render: (u) => new Date(u.createdAt).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' }),
                },
                {
                  key: 'actions',
                  header: t('common.actions'),
                  render: (u) => (
                    <button onClick={() => navigate(ROUTES.ADMIN.USER_DETAIL(u.id))} className="px-2.5 py-1 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                      {t('common.view')}
                    </button>
                  ),
                },
              ]}
            />
            <div className="flex items-center px-4 py-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">{t('users.list.showingSummary', { shown: users.length, total })}</span>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
