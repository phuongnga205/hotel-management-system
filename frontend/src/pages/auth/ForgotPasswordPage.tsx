import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Form, Input, Button } from 'antd'
import { CheckCircleOutlined } from '@ant-design/icons'
import { toast } from 'react-toastify'
import { authApi } from '../../api/auth.api'
import { ROUTES } from '../../router/paths'

export const ForgotPasswordPage = () => {
  const { t } = useTranslation(['auth'])
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const onFinish = async (values: any) => {
    try {
      setLoading(true)
      await authApi.forgotPassword({ email: values.email })
      setSuccess(true)
      toast.success(t('auth:forgotPasswordSuccess'))
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
        <h2 className="auth-title-small">{t('auth:forgotPassword')}</h2>
        
        {success ? (
          <div className="text-center">
            <div className="auth-success-icon">
              <CheckCircleOutlined />
            </div>
            <p className="auth-success-text">
              {t('auth:resetEmailSent')}
            </p>
            <Button type="primary" onClick={() => navigate(ROUTES.LOGIN)} className="btn-primary btn-large-full">
              {t('auth:backToLogin')}
            </Button>
          </div>
        ) : (
          <Form layout="vertical" onFinish={onFinish} size="large">
            <p className="auth-subtitle">
              {t('auth:forgotPasswordDesc')}
            </p>
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

            <Form.Item>
              <Button type="primary" htmlType="submit" className="btn-primary btn-large-full" loading={loading}>
                {t('auth:resetPassword')}
              </Button>
            </Form.Item>
            
            <div className="auth-footer">
              <Link to={ROUTES.LOGIN} className="link-standard">
                {t('auth:backToLogin')}
              </Link>
            </div>
          </Form>
        )}
      </div>
    </div>
  )
}
