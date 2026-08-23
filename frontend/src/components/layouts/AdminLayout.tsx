import { NavLink, Outlet, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { GlobalOutlined, DownOutlined } from '@ant-design/icons'
import { ROUTES } from '../../router/paths'
import { clearAccessToken } from '../../api/axiosClient'

const NAV_ITEMS: { to: string; key: string; end?: boolean }[] = [
  { to: ROUTES.ADMIN.DASHBOARD, key: 'dashboard', end: true },
  { to: ROUTES.ADMIN.ROOMS, key: 'rooms' },
  { to: ROUTES.ADMIN.AMENITIES, key: 'amenities' },
  { to: ROUTES.ADMIN.BOOKINGS, key: 'bookings' },
  { to: ROUTES.ADMIN.USERS, key: 'users' },
  { to: ROUTES.ADMIN.REVIEWS, key: 'reviews' },
  { to: ROUTES.ADMIN.STATS_BOOKINGS, key: 'statisticsBookings' },
  { to: ROUTES.ADMIN.STATS_REVENUE, key: 'statisticsRevenue' },
  { to: ROUTES.ADMIN.EMAIL_LOGS, key: 'emailLogs' },
]

export const AdminLayout = () => {
  const { t, i18n } = useTranslation('admin')

  const handleLogout = () => {
    clearAccessToken()
    window.location.href = ROUTES.HOME
  }

  const handleLanguageChange: MenuProps['onClick'] = (e) => {
    i18n.changeLanguage(e.key)
  }

  const languageItems: MenuProps['items'] = [
    { key: 'vi', label: `🇻🇳 ${t('language.vi', { ns: 'common' })}` },
    { key: 'en', label: `🇺🇸 ${t('language.en', { ns: 'common' })}` },
  ]

  return (
    <div className="min-h-screen flex bg-surface">
      {/* sticky (khong phai flex item thuong): khong bi cuon theo main content -
          tranh 2 nut duoi cung (Back to site/Log out) bien mat khi trang dai
          (dashboard, cac trang statistics co bieu do). */}
      <aside className="w-60 shrink-0 bg-navy text-white flex flex-col sticky top-0 h-screen overflow-y-auto">
        <Link to={ROUTES.ADMIN.DASHBOARD} className="flex items-center gap-2 px-6 py-5 text-lg font-serif font-bold border-b border-white/10">
          <span className="text-gold">✨</span> Grandeur
        </Link>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ to, key, end }) => (
            <NavLink
              key={key}
              to={to}
              end={end}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {t(`nav.${key}`)}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <Link to={ROUTES.HOME} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
            {t('nav.backToSite')}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            {t('common.logout')}
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-6 lg:p-8">
        <Outlet />
      </main>

      {/* Toggle vi/en - noi tren moi component khac (z-50), nang len 1 chut
          (bottom-6) thay vi dinh sat mep de khong bi che boi scrollbar/thanh
          cuon trinh duyet. Hien o moi man hinh admin vi dat trong layout dung
          chung, khong phai tung page rieng. */}
      <div className="fixed bottom-6 right-6 z-50">
        <Dropdown menu={{ items: languageItems, onClick: handleLanguageChange }} placement="topRight" arrow>
          <button className="flex items-center gap-1.5 bg-navy text-white pl-3 pr-2.5 py-2 rounded-full shadow-lg hover:bg-navy-light transition-colors cursor-pointer border border-white/10">
            <GlobalOutlined className="text-sm" />
            <span className="uppercase text-xs font-bold">{i18n.resolvedLanguage || i18n.language || 'vi'}</span>
            <DownOutlined className="text-[10px]" />
          </button>
        </Dropdown>
      </div>
    </div>
  )
}
