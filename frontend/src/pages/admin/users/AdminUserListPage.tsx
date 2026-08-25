import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import PageHeader from '../../../components/PageHeader'
import Card from '../../../components/Card'
import Pagination from '../../../components/Pagination'
import FieldLabel from '../../../components/FieldLabel'
import inputBase from '../../../components/inputBase'
import { PageLoader } from '../../../components/common/PageLoader'
import TabBar from '../../../components/TabBar'
import RoleBadge from '../../../components/RoleBadge'
import Dropdown from '../../../components/Dropdown'
import { SearchInput, AdminTable, StatusBadge, USER_STATUS_CONFIG, ConfirmModal } from '../../../components/admin'
import { ROUTES } from '../../../router/paths'
import { adminUserApi } from '../../../api/admin-user.api'
import { getErrorMessage } from '../../../api/errorMessage'
import type { AdminUserListItem, SortOrder, UserStatus } from '../../../api/types'

const PER_PAGE = 10

export default function AdminUserListPage() {
  const { t, i18n } = useTranslation('admin')
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | UserStatus>('ALL')
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC')
  const [page, setPage] = useState(1)
  const [users, setUsers] = useState<AdminUserListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Bump sau khi tao user moi de trigger lai fetch, khong phai tu goi lai
  // adminUserApi.list() rieng trong handleCreate (dung 1 nguon load duy nhat).
  const [refreshKey, setRefreshKey] = useState(0)

  const [showCreate, setShowCreate] = useState(false)
  const [createEmail, setCreateEmail] = useState('')
  const [createUsername, setCreateUsername] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createPhone, setCreatePhone] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-with-loading-flag pattern, xem AdminBookingListPage.tsx
    setLoading(true)
    adminUserApi
      .list({ page, limit: PER_PAGE, search: search || undefined, status: statusFilter === 'ALL' ? undefined : statusFilter, sortOrder })
      .then((res) => { setUsers(res.items); setTotal(res.total) })
      .catch((err) => setError(getErrorMessage(err, t('common.notFoundGeneric'))))
      .finally(() => setLoading(false))
  }, [page, search, statusFilter, sortOrder, refreshKey, t])

  const sortOptions = [
    { value: 'DESC', label: t('common.sortNewest') },
    { value: 'ASC', label: t('common.sortOldest') },
  ]

  const openCreate = () => {
    setCreateEmail('')
    setCreateUsername('')
    setCreatePassword('')
    setCreatePhone('')
    setShowCreate(true)
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      await adminUserApi.create({
        email: createEmail,
        username: createUsername,
        password: createPassword,
        phone: createPhone || undefined,
      })
      toast.success(t('users.form.createSuccess'))
      setShowCreate(false)
      setPage(1)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      toast.error(getErrorMessage(err, t('users.form.createError')))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('users.list.eyebrow')}
        title={t('users.list.title')}
        subtitle={t('users.list.subtitle', { count: total })}
        action={
          <button onClick={openCreate} className="px-4 py-2 text-xs font-semibold text-white bg-navy rounded-lg hover:opacity-90 transition-opacity">
            {t('users.list.addUser')}
          </button>
        }
      />

      <Card>
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder={t('users.list.searchPlaceholder')} className="flex-1 max-w-xs" />
          <TabBar
            tabs={[
              { key: 'ALL', label: t('users.list.tabAll') },
              { key: 'ACTIVE', label: t('users.list.tabActive') },
              { key: 'INACTIVE', label: t('users.list.tabInactive') },
            ]}
            active={statusFilter}
            onChange={(k) => { setStatusFilter(k as 'ALL' | UserStatus); setPage(1) }}
          />
          <Dropdown value={sortOrder} onChange={(v) => { setSortOrder(v as SortOrder); setPage(1) }} options={sortOptions} size="sm" className="w-40" />
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
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-xs shrink-0">
                          {(u.fullName ?? u.username)[0]}
                        </div>
                      )}
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
            <Pagination page={page} total={total} perPage={PER_PAGE} onChange={setPage} />
          </>
        )}
      </Card>

      <ConfirmModal
        open={showCreate}
        title={t('users.form.createTitle')}
        danger={false}
        confirmLabel={creating ? t('users.form.submitCreating') : t('users.form.submitCreate')}
        onConfirm={handleCreate}
        onCancel={() => setShowCreate(false)}
      >
        <div className="space-y-3">
          <div>
            <FieldLabel>{t('users.form.fieldEmail')}</FieldLabel>
            <input type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} className={`${inputBase} border-slate-200`} required />
          </div>
          <div>
            <FieldLabel>{t('users.form.fieldUsername')}</FieldLabel>
            <input value={createUsername} onChange={(e) => setCreateUsername(e.target.value)} className={`${inputBase} border-slate-200`} required />
          </div>
          <div>
            <FieldLabel>{t('users.form.fieldPassword')}</FieldLabel>
            <input type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} className={`${inputBase} border-slate-200`} required minLength={6} />
            <p className="text-xs text-slate-400 mt-1">{t('users.form.fieldPasswordHint')}</p>
          </div>
          <div>
            <FieldLabel optional>{t('users.form.fieldPhone')}</FieldLabel>
            <input value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} className={`${inputBase} border-slate-200`} />
          </div>
        </div>
      </ConfirmModal>
    </div>
  )
}
