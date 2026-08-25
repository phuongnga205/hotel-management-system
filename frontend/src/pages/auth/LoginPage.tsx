import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Form, Input, Button } from 'antd'
import { toast } from 'react-toastify'
import { authApi } from '../../api/auth.api'
import { setAccessToken } from '../../api/axiosClient'
import { getErrorMessage } from '../../api/errorMessage'
import type { LoginPayload } from '../../api/types'
import { ROUTES } from '../../router/paths'
import { useAuth } from '../../hooks/useAuth'

export const LoginPage = () => {
  const { t } = useTranslation(['auth'])
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const { refreshUser } = useAuth()

  const onFinish = async (values: LoginPayload) => {
    try {
      setLoading(true)
      const res = await authApi.login(values)

      if (res.accessToken) {
        setAccessToken(res.accessToken)
        // Bao AuthContext biet vua co token moi de fetch lai profile (role...)
        // ngay, khong doi tro ve trang - Header/AdminGuard doc lai qua useAuth()
        // se cap nhat dung ngay sau khi promise nay resolve.
        await refreshUser()
        toast.success(t('auth:loginSuccess'))
        // Khong co ?redirect= tuong minh (vd bi bounce tu 1 trang /admin/**
        // cu the) -> tu quyet dinh trang mac dinh theo role, tranh admin
        // dang nhap xong lai roi vao HomePage huong nguoi dung thuong (lay
        // role tu chinh LoginResponse.user, khong doi state AuthContext cap
        // nhat vi setState bat dong bo, co the chua kip o day).
        const redirectUrl = searchParams.get('redirect') || (res.user.role === 'ADMIN' ? ROUTES.ADMIN.DASHBOARD : ROUTES.HOME)
        navigate(redirectUrl)
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t('auth:errors.invalidCredentials')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-overlay"></div>
      <div className="auth-card">
        <h2 className="auth-title">{t('auth:login')}</h2>
        
        <Form<LoginPayload> layout="vertical" onFinish={onFinish} size="large">
          <Form.Item
            label={<span className="auth-label">{t('auth:email')}</span>}
            name="email"
            rules={[
              { required: true, message: t('auth:errors.required', { field: t('auth:email') }) },
              { type: 'email', message: t('auth:errors.invalidEmail') },
            ]}
          >
            <Input placeholder="example@email.com" className="rounded-lg" />
          </Form.Item>

          <Form.Item
            label={<span className="auth-label">{t('auth:password')}</span>}
            name="password"
            rules={[
              { required: true, message: t('auth:errors.required', { field: t('auth:password') }) },
            ]}
          >
            <Input.Password placeholder="••••••••" className="rounded-lg" />
          </Form.Item>

          <div className="auth-link-wrapper">
            <Link to={ROUTES.FORGOT_PASSWORD} className="link-standard text-sm">
              {t('auth:forgotPassword')}
            </Link>
          </div>

          <Form.Item>
            <Button type="primary" htmlType="submit" className="btn-primary btn-large-full" loading={loading}>
              {t('auth:login')}
            </Button>
          </Form.Item>
          
          <div className="auth-footer">
            <Link to={ROUTES.REGISTER} className="link-standard">
              {t('auth:dontHaveAccount')}
            </Link>
          </div>

          <div className="auth-footer">
            <Link to={ROUTES.HOME} className="link-standard">
              {t('auth:backToHome')}
            </Link>
          </div>
        </Form>
      </div>
    </div>
  )
}

export default LoginPage
