import { useTranslation } from 'react-i18next'

/**
 * Placeholder cho trang đăng nhập.
 * TODO: thay bằng form đăng nhập thật (email/password, gọi API /auth/login)
 * khi tính năng auth được triển khai.
 */
function LoginPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">{t('auth.login')}</h1>
    </div>
  )
}

export default LoginPage
