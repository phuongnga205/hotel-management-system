import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import PageHeader from '../../../components/PageHeader'
import Card from '../../../components/Card'
import DetailGrid from '../../../components/DetailGrid'
import RoleBadge from '../../../components/RoleBadge'
import { PageLoader } from '../../../components/common/PageLoader'
import { Breadcrumb, StatusBadge, USER_STATUS_CONFIG, AdminTable, BOOKING_STATUS_CONFIG } from '../../../components/admin'
import { ROUTES } from '../../../router/paths'
import { adminUserApi } from '../../../api/admin-user.api'
import { bookingApi } from '../../../api/booking.api'
import { getErrorMessage } from '../../../api/errorMessage'
import type { AdminUserListItem, Booking } from '../../../api/types'

export default function AdminUserDetailPage() {
  const { t, i18n } = useTranslation('admin')
  const { userId } = useParams()
  const [user, setUser] = useState<AdminUserListItem | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    if (!userId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-with-loading-flag pattern, xem AdminBookingListPage.tsx
    setLoading(true)
    // Chua co filter theo userId o admin bookings list API - tam lay 1 trang
    // lon roi loc phia client, chap nhan gioi han nay cho toi khi BE co
    // query rieng (vd ?userId=).
    Promise.all([adminUserApi.getById(userId), bookingApi.adminList({ page: 1, limit: 100 })])
      .then(([u, b]) => { setUser(u); setBookings(b.items.filter((booking) => booking.user?.id === userId)) })
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <PageLoader />
  if (!user) return <p className="text-slate-500">{t('common.notFoundGeneric')}</p>

  const handleToggleStatus = async () => {
    setToggling(true)
    try {
      const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
      const updated = await adminUserApi.update(user.id, { status: nextStatus })
      setUser(updated)
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.notFoundGeneric')))
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: t('users.list.title'), to: ROUTES.ADMIN.USERS }, { label: user.fullName ?? user.username }]} />
      <PageHeader eyebrow={t('users.list.eyebrow')} title={user.fullName ?? user.username} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-5">
          <div className="text-center mb-5">
            <div className="w-16 h-16 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-2xl mx-auto mb-3">
              {(user.fullName ?? user.username)[0]}
            </div>
            <h2 className="font-bold text-navy text-lg">{user.fullName ?? user.username}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
            <div className="mt-2">
              <StatusBadge status={user.status} config={USER_STATUS_CONFIG} />
            </div>
          </div>

          <DetailGrid
            cols={2}
            className="mb-5"
            items={[
              { label: t('users.detail.fieldPhone'), value: user.phone ?? '—' },
              { label: t('users.detail.fieldRole'), value: <RoleBadge role={user.role} /> },
              { label: t('users.detail.fieldJoined'), value: new Date(user.createdAt).toLocaleDateString(i18n.language, { month: 'long', day: 'numeric', year: 'numeric' }) },
              { label: t('users.detail.fieldTotalBookings'), value: String(bookings.length) },
            ]}
          />

          <div className="flex gap-2">
            <button
              onClick={handleToggleStatus}
              disabled={toggling}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors disabled:opacity-60 ${
                user.status === 'ACTIVE'
                  ? 'border border-red-300 text-red-600 hover:bg-red-50'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}
            >
              {user.status === 'ACTIVE' ? t('users.detail.deactivate') : t('users.detail.activate')}
            </button>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-semibold text-navy text-sm">{t('users.detail.bookingHistoryTitle')}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{t('users.detail.bookingCount', { count: bookings.length })}</p>
          </div>
          {bookings.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">{t('users.detail.noBookings')}</div>
          ) : (
            <AdminTable
              rowKey={(b: Booking) => b.id}
              rows={bookings}
              columns={[
                { key: 'id', header: t('table.id'), render: (b) => <span className="font-mono text-xs font-semibold text-navy">#{b.id}</span> },
                { key: 'room', header: t('table.room'), render: (b) => b.room?.name ?? '—' },
                { key: 'checkIn', header: t('table.checkIn'), className: 'text-slate-500 whitespace-nowrap text-xs', render: (b) => new Date(b.checkInDate).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' }) },
                { key: 'total', header: t('table.total'), render: (b) => `$${b.totalPrice.toLocaleString()}` },
                { key: 'status', header: t('common.status'), render: (b) => <StatusBadge status={b.status} config={BOOKING_STATUS_CONFIG} /> },
              ]}
            />
          )}
        </Card>
      </div>
    </div>
  )
}
