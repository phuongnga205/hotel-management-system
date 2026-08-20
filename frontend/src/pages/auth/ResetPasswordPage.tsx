import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Form, Input, Button } from 'antd'
import { toast } from 'react-toastify'
import { authApi } from '../../api/auth.api'
import { getErrorMessage } from '../../api/errorMessage'
import type { ResetPasswordPayload } from '../../api/types'
import { ROUTES } from '../../router/paths'

// Form có thêm `confirmPassword` (chỉ để validate ở FE) so với payload thật
// gửi lên BE (`ResetPasswordPayload`).
interface ResetPasswordFormValues extends ResetPasswordPayload {
  confirmPassword: string
}

export const ResetPasswordPage = () => {
  const { t } = useTranslation(['auth', 'profile'])
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)

  // `?email=` chỉ để prefill — xác thực thật là email + OTP đúng, không phải
  // token trong URL (xem frontend/docs/bridge.md, backend/docs/DANH_SACH_API.md).
  const emailFromQuery = searchParams.get('email') ?? ''

  const onFinish = async (values: ResetPasswordFormValues) => {
    try {
      setLoading(true)
      await authApi.resetPassword({
        email: values.email,
        otp: values.otp,
        newPassword: values.newPassword,
      })
      toast.success(t('auth:resetPasswordSuccess'))
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
        <h2 className="auth-title-small">{t('auth:resetPassword')}</h2>
        <p className="auth-subtitle">{t('auth:resetPasswordDesc')}</p>

        <Form<ResetPasswordFormValues>
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

          <Form.Item
            label={<span className="auth-label">{t('profile:newPassword')}</span>}
            name="newPassword"
            rules={[
              { required: true, message: t('auth:errors.required', { field: t('auth:password') }) },
              { min: 6, message: t('auth:errors.passwordLength', { min: 6 }) },
            ]}
          >
            <Input.Password placeholder="••••••••" className="rounded-lg" />
          </Form.Item>

          <Form.Item
            label={<span className="auth-label">{t('auth:confirmPassword')}</span>}
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: t('auth:errors.required', { field: t('auth:confirmPassword') }) },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
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
              {t('auth:resetPassword')}
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

export default ResetPasswordPage
