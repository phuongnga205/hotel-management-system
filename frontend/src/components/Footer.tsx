import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export const Footer = () => {
  const { t } = useTranslation('common')

  const quickLinks = [
    { to: '/rooms', label: t('footer.rooms') },
    { to: '/dining', label: t('footer.dining') },
    { to: '/spa', label: t('footer.spa') },
    { to: '/events', label: t('footer.events') },
    { to: '/contact', label: t('footer.contact') },
  ]

  return (
    <footer className="bg-navy-dark text-gray-300 py-12 px-8 font-sans mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-2 pr-8">
          <Link to="/" className="text-xl font-serif font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-gold">✨</span> {t('app.name')}
          </Link>
          <p className="text-sm leading-relaxed text-gray-400">{t('footer.tagline')}</p>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4 text-sm tracking-wider uppercase">{t('footer.quickLinks')}</h4>
          <ul className="space-y-3 text-sm text-gray-400">
            {quickLinks.map(({ to, label }) => (
              <li key={to}><Link to={to} className="hover:text-white transition-colors">{label}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4 text-sm tracking-wider uppercase">{t('footer.contactTitle')}</h4>
          <ul className="space-y-3 text-sm text-gray-400">
            <li>{t('footer.address')}</li>
            <li>{t('footer.phone')}</li>
            <li>{t('footer.email')}</li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-800 text-sm text-gray-500 text-center">
        {t('footer.copyright', { year: new Date().getFullYear() })}
      </div>
    </footer>
  )
}
