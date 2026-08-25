import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTES } from '../router/paths'

export default function ServerDownPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  // axiosClient's response interceptor ghi lai duong dan dang xem luc request
  // that bai (state.from) truoc khi dieu huong ve day - xem axiosClient.ts.
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  // Truoc day nut nay goi window.location.reload() - reload cung tai URL
  // /server-down (chinh trang nay khong tu goi API nao ca), nen du server da
  // song lai, trang van hien y het, khong co cach nao thoat ra ngoai nut
  // back cua trinh duyet. Dieu huong that su ve trang vua bi loi (hoac Home
  // neu khong co) de trang do tu goi lai API cua no - neu server that su da
  // song lai thi request thanh cong va user roi khoi day; neu van con lien,
  // interceptor se lai dua ve day (dung nhu mong doi).
  const handleRetry = () => {
    navigate(from ?? ROUTES.HOME, { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-danger text-xs font-semibold uppercase tracking-widest mb-3">{t('serverDown.eyebrow')}</p>
        <h1 className="text-6xl font-bold text-navy mb-4">{t('serverDown.title')}</h1>
        <p className="text-slate-500 text-base mb-8 max-w-md mx-auto">{t('serverDown.desc')}</p>
        <button
          type="button"
          onClick={handleRetry}
          className="btn-primary inline-block rounded-xl active:scale-95"
        >
          {t('serverDown.cta')}
        </button>
      </div>
    </div>
  )
}
