import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { LogoutOutlined, ProfileOutlined, GlobalOutlined, DownOutlined } from '@ant-design/icons'
import { ROUTES } from '../router/paths'
import { getAccessToken, clearAccessToken } from '../api/axiosClient'

const MOCK_AVATAR_URL = 'https://i.pravatar.cc/150?img=11'

export const Header = () => {
  const { t, i18n } = useTranslation(['common', 'auth'])
  const isAuthenticated = !!getAccessToken()

  const handleLogout = () => {
    clearAccessToken()
    window.location.href = ROUTES.HOME
  }

  const handleLanguageChange: MenuProps['onClick'] = (e) => {
    i18n.changeLanguage(e.key)
  }

  const languageItems: MenuProps['items'] = [
    {
      key: 'vi',
      label: `🇻🇳 ${t('language.vi')}`,
    },
    {
      key: 'en',
      label: `🇺🇸 ${t('language.en')}`,
    },
  ]

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <ProfileOutlined />,
      label: <Link to="/profile">{t('navigation.profile')}</Link>,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: <span onClick={handleLogout}>{t('navigation.logout')}</span>,
      danger: true,
    },
  ]

  return (
    <header className="bg-navy text-white flex items-center justify-between px-8 py-4 sticky top-0 z-50 shadow-md">
      <Link to={ROUTES.HOME} className="text-xl font-serif font-bold tracking-wide text-white hover:text-gray-200 flex items-center gap-2">
        <span className="text-[#eab308]">✨</span> Grandeur
      </Link>

      <div className="flex items-center gap-6 text-sm font-bold">
        <nav className="hidden md:flex items-center gap-2">
          <NavLink 
            to={ROUTES.HOME} 
            className={({ isActive }) => isActive ? "bg-white/10 text-white px-4 py-2 rounded-lg transition-colors font-bold" : "text-gray-300 hover:bg-white/5 hover:text-white px-4 py-2 rounded-lg transition-colors"}
          >
            {t('navigation.home')}
          </NavLink>
          <NavLink 
            to="/rooms" 
            className={({ isActive }) => isActive ? "bg-white/10 text-white px-4 py-2 rounded-lg transition-colors font-bold" : "text-gray-300 hover:bg-white/5 hover:text-white px-4 py-2 rounded-lg transition-colors"}
          >
            {t('navigation.rooms')}
          </NavLink>
          <NavLink 
            to="/bookings" 
            className={({ isActive }) => isActive ? "bg-white/10 text-white px-4 py-2 rounded-lg transition-colors font-bold" : "text-gray-300 hover:bg-white/5 hover:text-white px-4 py-2 rounded-lg transition-colors"}
          >
            {t('navigation.myBookings')}
          </NavLink>
        </nav>
        
        <div className="w-px h-5 bg-gray-700 mx-2"></div>

        <Dropdown menu={{ items: languageItems, onClick: handleLanguageChange }} placement="bottomRight" arrow>
          <div className="flex items-center gap-1 cursor-pointer text-gray-300 hover:text-white transition-colors px-2">
            <GlobalOutlined className="text-lg" />
            <span className="uppercase text-xs font-bold">{i18n.resolvedLanguage || i18n.language || 'vi'}</span>
            <DownOutlined className="text-[10px]" />
          </div>
        </Dropdown>

        {isAuthenticated ? (
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
              <img src={MOCK_AVATAR_URL} alt="Avatar" className="w-8 h-8 rounded-full border border-gray-600 object-cover" />
            </div>
          </Dropdown>
        ) : (
          <div className="flex items-center gap-4">
            <Link 
              to={ROUTES.LOGIN} 
              className="text-gray-300 hover:text-white font-bold transition-colors"
            >
              {t('auth:login')}
            </Link>
            <Link 
              to={ROUTES.REGISTER} 
              className="bg-gold-light hover:bg-gold text-navy font-bold px-5 py-2 rounded-full transition-colors shadow-sm"
            >
              {t('auth:register')}
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
