import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Form, Input, Button } from 'antd'
import { toast } from 'react-toastify'
import { authApi } from '../../api/auth.api'
import { getErrorMessage } from '../../api/errorMessage'
import type { ActivatePayload } from '../../api/types'
import { ROUTES } from '../../router/paths'

export const ActivatePage = () => {
  const { t } = useTranslation(['auth'])
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)

  // `?email=` chỉ để prefill cho tiện, không phải cơ chế xác thực — xác thực
  // thật là user gõ đúng OTP nhận qua email (xem frontend/docs/bridge.md).
  const emailFromQuery = searchParams.get('email') ?? ''

  const onFinish = async (values: ActivatePayload) => {
    try {
      setLoading(true)
      await authApi.activate(values)
      toast.success(t('auth:activateSuccess'))
      navigate(ROUTES.LOGIN)
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
        <h2 className="auth-title-small">{t('auth:activate')}</h2>
        <p className="auth-subtitle">{t('auth:activateDesc')}</p>

        <Form<ActivatePayload>
          layout="vertical"
          onFinish={onFinish}
          size="large"
          initialValues={{ email: emailFromQuery }}
        >
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
            label={<span className="auth-label">{t('auth:otp')}</span>}
            name="otp"
            rules={[
              { required: true, message: t('auth:errors.required', { field: t('auth:otp') }) },
              { len: 6, message: t('auth:errors.otpLength') },
              { pattern: /^\d{6}$/, message: t('auth:errors.otpFormat') },
            ]}
          >
            <Input placeholder="000000" maxLength={6} className="rounded-lg" inputMode="numeric" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" className="btn-primary btn-large-full" loading={loading}>
              {t('auth:activate')}
            </Button>
          </Form.Item>

          <div className="auth-footer">
            <Link to={ROUTES.LOGIN} className="link-standard">
              {t('auth:backToLogin')}
            </Link>
          </div>
        </Form>
      </div>
    </div>
  )
}

export default ActivatePage
