import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { LogoutOutlined, ProfileOutlined, GlobalOutlined, DownOutlined, CreditCardOutlined } from '@ant-design/icons'
import { ROUTES } from '../router/paths'
import { useAuth } from '../hooks/useAuth'
import { authApi } from '../api/auth.api'

// Anh mac dinh khi user chua tung upload avatar - KHONG phai "mock" (hien
// dung cho ca mock lan real user chua co avatarUrl), chi la placeholder.
const DEFAULT_AVATAR_URL = 'https://i.pravatar.cc/150?img=11'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? 'bg-white/10 text-white px-4 py-2 rounded-lg transition-colors font-bold'
    : 'text-gray-300 hover:bg-white/5 hover:text-white px-4 py-2 rounded-lg transition-colors'

export const Header = () => {
  const { t, i18n } = useTranslation(['common', 'auth'])
  const navigate = useNavigate()
  const { user, isAuthenticated, isAdmin, logout } = useAuth()

  const handleLogout = async () => {
    // Goi BE thu hoi token (Redis blacklist) TRUOC khi xoa token o
    // localStorage - lam nguoc lai se khong con token de gui kem request
    // logout nua. Best-effort: mang loi/token da het han khong duoc chan
    // hanh dong dang xuat cua user (van xoa token cuc bo + dieu huong).
    try {
      await authApi.logout()
    } catch {
      // im lang - user van dang xuat duoc cuc bo du BE khong phan hoi duoc.
    }
    logout()
    navigate(ROUTES.HOME)
  }

  const handleLanguageChange: MenuProps['onClick'] = (e) => {
    i18n.changeLanguage(e.key)
  }

  // Dropdown antd chi coi ca hang cua 1 Menu.Item la clickable khi click
  // duoc bat qua prop `onClick` cua `menu` (giong het pattern languageItems
  // o tren) - truoc day gan onClick truc tiep vao <span> ben trong `label`
  // nen chi vung chu chinh xac moi bam duoc, bam vao icon/padding quanh do
  // (van nam trong hang Menu.Item, trong mat nguoi dung) khong lam gi ca ->
  // dung trieu chung "khong log out duoc moi lan bam".
  const handleUserMenuClick: MenuProps['onClick'] = (e) => {
    if (e.key === 'logout') {
      handleLogout()
    }
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

  // Admin: chi con Profile + Logout - khong con muc "Admin" o day nua vi da
  // co han tab rieng "Admin Console" tren thanh nav (xem ben duoi). User
  // thuong: co them "Lich su thanh toan" thay vao dung vi tri "Admin" cu tung
  // nam - day la quyet dinh phan quyen that dua tren role tu AuthContext
  // (useAuth(), khong con dua vao AdminGuard tu redirect nhu truoc), hoat
  // dong giong nhau ca mock lan real BE.
  const userMenuItems: MenuProps['items'] = isAdmin
    ? [
        {
          key: 'profile',
          icon: <ProfileOutlined />,
          label: <Link to={ROUTES.PROFILE}>{t('navigation.profile')}</Link>,
        },
        {
          key: 'logout',
          icon: <LogoutOutlined />,
          label: t('navigation.logout'),
          danger: true,
        },
      ]
    : [
        {
          key: 'paymentHistory',
          icon: <CreditCardOutlined />,
          label: <Link to={ROUTES.PAYMENTS}>{t('navigation.paymentHistory')}</Link>,
        },
        {
          key: 'profile',
          icon: <ProfileOutlined />,
          label: <Link to={ROUTES.PROFILE}>{t('navigation.profile')}</Link>,
        },
        {
          key: 'logout',
          icon: <LogoutOutlined />,
          label: t('navigation.logout'),
          danger: true,
        },
      ]

  return (
    <header className="bg-navy text-white flex items-center justify-between px-8 py-4 sticky top-0 z-50 shadow-md">
      <Link to={ROUTES.HOME} className="text-xl font-serif font-bold tracking-wide text-white hover:text-gray-200 flex items-center gap-2">
        <span className="text-gold">✨</span> Grandeur
      </Link>

      <div className="flex items-center gap-6 text-sm font-bold">
        <nav className="hidden md:flex items-center gap-2">
          {isAdmin ? (
            // Admin dang nhap: chi hien 1 tab duy nhat dan vao khu vuc quan tri,
            // khong can cac tab danh cho user thuong (Home/Rooms/Bookings/Reviews).
            <NavLink to={ROUTES.ADMIN.DASHBOARD} className={navLinkClass}>
              {t('navigation.adminConsole')}
            </NavLink>
          ) : (
            <>
              <NavLink to={ROUTES.HOME} className={navLinkClass}>
                {t('navigation.home')}
              </NavLink>
              <NavLink to="/rooms" className={navLinkClass}>
                {t('navigation.rooms')}
              </NavLink>
              <NavLink to="/bookings" className={navLinkClass}>
                {t('navigation.myBookings')}
              </NavLink>
              <NavLink to={ROUTES.REVIEWS} className={navLinkClass}>
                {t('navigation.reviews')}
              </NavLink>
            </>
          )}
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
          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight" arrow>
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
              <img src={user?.avatarUrl || DEFAULT_AVATAR_URL} alt="Avatar" className="w-8 h-8 rounded-full border border-gray-600 object-cover" />
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
