import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import dayjs from 'dayjs'
import PageHeader from '../../components/PageHeader'
import Card from '../../components/Card'
import DetailGrid from '../../components/DetailGrid'
import Dropdown from '../../components/Dropdown'
import Pagination from '../../components/Pagination'
import EmptyState from '../../components/EmptyState'
import PaymentBadge from '../../components/PaymentBadge'
import { PageLoader } from '../../components/common/PageLoader'
import { paymentApi } from '../../api/payment.api'
import { getErrorMessage } from '../../api/errorMessage'
import { formatCurrency } from '../../utils/formatCurrency'
import type { PaymentMethod, PaymentStatus, UserPayment } from '../../api/types'

const PER_PAGE = 10
const PAYMENT_STATUSES: PaymentStatus[] = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED']
const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'VNPAY']

export function PaymentHistoryPage() {
  // Label trang thai/phuong thuc tai dung tu namespace 'admin' (status.payment.*,
  // status.paymentMethod.*) - dung 1 nguon duy nhat cho ca Admin lan User thay vi
  // dinh nghia lai, khop dung convention da ghi trong SO_TAY_MAN_HINH_USER_CON_LAI.md.
  const { t } = useTranslation(['payment', 'admin'])

  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [methodFilter, setMethodFilter] = useState('ALL')
  const [payments, setPayments] = useState<UserPayment[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    paymentApi
      .listMine({
        page,
        limit: PER_PAGE,
        status: statusFilter === 'ALL' ? undefined : (statusFilter as PaymentStatus),
        method: methodFilter === 'ALL' ? undefined : (methodFilter as PaymentMethod),
      })
      .then((res) => {
        setPayments(res.items)
        setTotal(res.total)
      })
      .catch((err) => toast.error(getErrorMessage(err, t('payment:fetchError'))))
      .finally(() => setLoading(false))
  }, [page, statusFilter, methodFilter, t])

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }
  const handleMethodChange = (value: string) => {
    setMethodFilter(value)
    setPage(1)
  }

  const statusOptions = [
    { value: 'ALL', label: t('payment:filters.allStatuses') },
    ...PAYMENT_STATUSES.map((s) => ({ value: s, label: t(`admin:status.payment.${s}`) })),
  ]
  const methodOptions = [
    { value: 'ALL', label: t('payment:filters.allMethods') },
    ...PAYMENT_METHODS.map((m) => ({ value: m, label: t(`admin:status.paymentMethod.${m}`) })),
  ]

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 min-h-screen">
      <PageHeader eyebrow={t('payment:eyebrow')} title={t('payment:title')} subtitle={t('payment:subtitle')} />

      <div className="flex flex-wrap gap-3 mb-6">
        <Dropdown value={statusFilter} onChange={handleStatusChange} options={statusOptions} className="w-44" />
        <Dropdown value={methodFilter} onChange={handleMethodChange} options={methodOptions} className="w-44" />
      </div>

      {loading && payments.length === 0 ? (
        <PageLoader fullPage={false} />
      ) : payments.length === 0 ? (
        <EmptyState icon="💳" title={t('payment:empty')} desc={t('payment:emptyDesc')} />
      ) : (
        <div className={`flex flex-col gap-4 transition-opacity ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          {payments.map((payment) => {
            const roomName = payment.booking?.roomName ?? t('payment:labels.unknownRoom')
            return (
              <Card key={payment.id} className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-semibold text-navy">{roomName}</h3>
                    {payment.booking && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {dayjs(payment.booking.checkInDate).format('MMM D, YYYY')} → {dayjs(payment.booking.checkOutDate).format('MMM D, YYYY')}
                      </p>
                    )}
                  </div>
                  <PaymentBadge status={payment.status} />
                </div>

                <DetailGrid
                  cols={3}
                  items={[
                    { label: t('payment:labels.amount'), value: <span className="font-bold text-navy">{formatCurrency(Number(payment.amount))}</span> },
                    { label: t('payment:labels.method'), value: t(`admin:status.paymentMethod.${payment.method}`) },
                    {
                      label: t('payment:labels.paidAt'),
                      value: payment.paidAt ? dayjs(payment.paidAt).format('MMM D, YYYY HH:mm') : t('payment:labels.notPaidYet'),
                    },
                  ]}
                />

                {payment.transactionId && (
                  <p className="text-xs text-slate-400 mt-3">
                    {t('payment:labels.transactionId')}: {payment.transactionId}
                  </p>
                )}
              </Card>
            )
          })}
          <Pagination page={page} total={total} perPage={PER_PAGE} onChange={setPage} />
        </div>
      )}
    </div>
  )
}
