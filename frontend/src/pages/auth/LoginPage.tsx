import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Form, Input, Button } from 'antd'
import { toast } from 'react-toastify'
import { authApi } from '../../api/auth.api'
import { setAccessToken } from '../../api/axiosClient'
import { ROUTES } from '../../router/paths'

export const LoginPage = () => {
  const { t } = useTranslation(['auth'])
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: any) => {
    try {
      setLoading(true)
      const res = await authApi.login({
        email: values.email,
        password: values.password,
      })
      
      if (res.accessToken) {
        setAccessToken(res.accessToken)
        toast.success(t('auth:loginSuccess'))
        const redirectUrl = searchParams.get('redirect') || ROUTES.HOME
        navigate(redirectUrl)
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || t('auth:errors.invalidCredentials')
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-overlay"></div>
      <div className="auth-card">
        <h2 className="auth-title">{t('auth:login')}</h2>
        
        <Form layout="vertical" onFinish={onFinish} size="large">
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
        </Form>
      </div>
    </div>
  )
}

export default LoginPage
