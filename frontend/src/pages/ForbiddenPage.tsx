import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES } from '../router/paths'

export default function ForbiddenPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-danger text-xs font-semibold uppercase tracking-widest mb-3">{t('forbidden.eyebrow')}</p>
        <h1 className="text-6xl font-bold text-navy mb-4">{t('forbidden.title')}</h1>
        <p className="text-slate-500 text-base mb-8 max-w-md mx-auto">{t('forbidden.desc', { brand: t('app.name') })}</p>
        <Link to={ROUTES.HOME} className="btn-primary inline-block rounded-xl active:scale-95">
          {t('forbidden.cta')}
        </Link>
      </div>
    </div>
  )
}
