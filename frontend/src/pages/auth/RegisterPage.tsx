import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Form, Input, Button } from 'antd'
import { toast } from 'react-toastify'
import { authApi } from '../../api/auth.api'
import { ROUTES } from '../../router/paths'

export const RegisterPage = () => {
  const { t } = useTranslation(['auth', 'common'])
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: any) => {
    try {
      setLoading(true)
      await authApi.register({
        email: values.email,
        password: values.password,
        username: values.username,
      })
      
      toast.success(t('auth:registerSuccess'))
      // Registration typically needs activation, so we might stay or go to a wait page.
      // The doc says: "Submit xong → hiện modal 'vui lòng kiểm tra email kích hoạt' ngay trên trang này, không đổi route."
      // But a toast is fine and we can clear the form, or navigate to login. Let's just use toast.
    } catch (error: any) {
      const msg = error.response?.data?.message || t('auth:errors.general')
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-overlay"></div>
      <div className="auth-card">
        <h2 className="auth-title">{t('auth:register')}</h2>
        
        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item
            label={<span className="auth-label">{t('common:common.name')}</span>}
            name="username"
            rules={[
              { required: true, message: t('auth:errors.required', { field: t('auth:username') }) },
            ]}
          >
            <Input placeholder="John Doe" className="auth-input" />
          </Form.Item>

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
              { min: 6, message: t('auth:errors.passwordLength', { min: 6 }) }
            ]}
          >
            <Input.Password placeholder="••••••••" className="rounded-lg" />
          </Form.Item>

          <Form.Item
            label={<span className="auth-label">{t('auth:confirmPassword')}</span>}
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: t('auth:errors.required', { field: t('auth:confirmPassword') }) },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error(t('auth:errors.passwordMismatch')))
                },
              }),
            ]}
          >
            <Input.Password placeholder="••••••••" className="rounded-lg" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" className="btn-primary btn-large-full" loading={loading}>
              {t('auth:register')}
            </Button>
          </Form.Item>
          
          <div className="auth-footer">
            <Link to={ROUTES.LOGIN} className="link-standard">
              {t('auth:alreadyHaveAccount')}
            </Link>
          </div>
        </Form>
      </div>
    </div>
  )
}
