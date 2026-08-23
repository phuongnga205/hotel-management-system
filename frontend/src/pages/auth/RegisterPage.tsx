import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Form, Input, Button } from 'antd'
import { CheckCircleOutlined } from '@ant-design/icons'
import { toast } from 'react-toastify'
import { authApi } from '../../api/auth.api'
import { getErrorMessage } from '../../api/errorMessage'
import type { RegisterPayload } from '../../api/types'
import { ROUTES } from '../../router/paths'

// Form có thêm `confirmPassword` (chỉ để validate ở FE) so với payload thật
// gửi lên BE (`RegisterPayload`), nên cần type riêng cho form.
interface RegisterFormValues extends RegisterPayload {
  confirmPassword: string
}

export const RegisterPage = () => {
  const { t } = useTranslation(['auth', 'common'])
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  // Đăng ký xong hiện modal ngay trên trang (không đổi route), kèm nút chuyển
  // sang /activate để nhập OTP — theo frontend/docs/CAU_TRUC_ROUTE.md.
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)

  const onFinish = async (values: RegisterFormValues) => {
    try {
      setLoading(true)
      await authApi.register({
        email: values.email,
        password: values.password,
        username: values.username,
      })

      toast.success(t('auth:registerSuccess'))
      setRegisteredEmail(values.email)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t('auth:errors.general')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-overlay"></div>
      <div className="auth-card">
        <h2 className="auth-title">{t('auth:register')}</h2>

        {registeredEmail ? (
          <div className="text-center">
            <div className="auth-success-icon">
              <CheckCircleOutlined />
            </div>
            <p className="auth-success-text">{t('auth:registerSuccess')}</p>
            <Button
              type="primary"
              onClick={() => navigate(`${ROUTES.ACTIVATE}?email=${encodeURIComponent(registeredEmail)}`)}
              className="btn-primary btn-large-full"
            >
              {t('auth:activate')}
            </Button>
          </div>
        ) : (
        <Form<RegisterFormValues> layout="vertical" onFinish={onFinish} size="large">
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
        )}
      </div>
    </div>
  )
}
