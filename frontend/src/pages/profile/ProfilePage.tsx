import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Form, Input, Button, Avatar, Tabs, Select } from 'antd'
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons'
import { toast } from 'react-toastify'
import { userApi, type UserProfile } from '../../api/user.api'
import { getErrorMessage } from '../../api/errorMessage'
import type { UpdateProfilePayload } from '../../api/types'
import { COUNTRIES } from '../../utils/countries'
import { PageLoader } from '../../components/common/PageLoader'


const { TabPane } = Tabs
const { Option } = Select

// Form đổi mật khẩu có thêm `confirmPassword` (chỉ validate ở FE), payload
// thật gửi lên BE chỉ gồm `currentPassword`/`newPassword` (`ChangePasswordPayload`).
interface PasswordFormValues {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

// Chỉ những field thật sự tồn tại trong bảng `users` (xem
// frontend/docs/bridge.md) mới được đưa vào form — không vẽ thêm field UI
// (địa chỉ/giới tính/quốc tịch/ngày sinh...) mà schema hiện tại chưa có.
export const ProfilePage = () => {
  const { t } = useTranslation(['profile', 'common', 'auth'])
  const [form] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await userApi.getProfile()
        setUserProfile(data)
        form.setFieldsValue({
          fullName: data.fullName,
          phone: data.phone,
        })
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, t('profile:loadError')))
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [form, t])

  const onFinishInfo = async (values: UpdateProfilePayload) => {
    try {
      setSaving(true)
      const updated = await userApi.updateProfile(values)
      setUserProfile(updated)
      toast.success(t('profile:updateSuccess'))
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t('profile:updateError')))
    } finally {
      setSaving(false)
    }
  }

  const onFinishPassword = async (values: PasswordFormValues) => {
    try {
      setSaving(true)
      await userApi.changePassword({
        currentPassword: values.oldPassword,
        newPassword: values.newPassword,
      })
      toast.success(t('profile:changePasswordSuccess'))
      passwordForm.resetFields()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, t('profile:changePasswordError')))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <PageLoader />
  }

  return (
    <div className="w-full bg-slate-50 min-h-[calc(100vh-64px)] py-12 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-playfair font-semibold mb-8 text-navy">{t('profile:title')}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Avatar & Basic Info */}
        <div className="col-span-1 lg:col-span-1">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
            <Avatar 
              size={120} 
              icon={<UserOutlined />} 
              src={userProfile?.avatarUrl}
              className="bg-navy-light text-white mb-6 shadow-md"
            />
            <h2 className="text-2xl mt-2 font-semibold text-center text-navy">{userProfile?.fullName}</h2>
            <span className="text-gray-400 text-sm">@{userProfile?.username}</span>
            <div className="flex flex-col items-center gap-3 mt-4 text-gray-500 text-sm w-full">
              <div className="flex items-center gap-3 w-full justify-center">
                <MailOutlined className="text-gold text-lg" />
                <span className="truncate">{userProfile?.email}</span>
              </div>
              <div className="flex items-center gap-3 w-full justify-center">
                <PhoneOutlined className="text-gold text-lg" />
                <span>{userProfile?.phone}</span>
              </div>
            </div>
            
            <Button className="mt-8 w-full border-navy text-navy hover:text-navy-light hover:border-navy-light rounded-lg h-10" type="dashed">
              {t('profile:changeAvatar')}
            </Button>
          </div>
        </div>

        {/* Main Content: Tabs */}
        <div className="col-span-1 lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[600px] overflow-hidden">
            <Tabs defaultActiveKey="1" size="large" className="custom-profile-tabs">
              
              {/* TAB 1: PERSONAL INFO */}
              <TabPane 
                tab={<span className="px-4"><UserOutlined className="mr-2" /> {t('profile:personalInfo')}</span>} 
                key="1"
              >
                <div className="p-6 md:p-8 max-w-4xl mx-auto">
                  <Form<UpdateProfilePayload>
                    form={form}
                    layout="vertical"
                    onFinish={onFinishInfo}
                    size="large"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                      
                      {/* Chỉ field có thật trong bảng `users` (bridge.md): fullName, phone.
                          `username`/`email` hiển thị read-only, không cho sửa ở đây — email
                          gắn với đăng nhập/kích hoạt, username là định danh unique. */}
                      <Form.Item
                        label={<span className="font-medium text-gray-700">{t('profile:username')}</span>}
                      >
                        <Input value={userProfile?.username} disabled className="rounded-lg h-12" />
                      </Form.Item>

                      <Form.Item
                        label={<span className="font-medium text-gray-700">{t('common:common.name')}</span>}
                        name="fullName"
                        rules={[{ required: true, message: t('profile:nameRequired') }]}
                      >
                        <Input prefix={<UserOutlined className="text-gray-400 mr-2" />} className="rounded-lg h-12" />
                      </Form.Item>

                      <Form.Item
                        label={<span className="font-medium text-gray-700">{t('profile:phone')}</span>}
                        name="phone"
                        className="md:col-span-2"
                      >
                        <Input
                          addonBefore={
                            <Form.Item name="dialCode" noStyle initialValue="+84">
                              <Select popupMatchSelectWidth={false} style={{ width: 100 }} className="h-full">
                                {COUNTRIES.map(country => (
                                  <Option key={country.code} value={country.dialCode}>
                                    {country.flag} {country.dialCode}
                                  </Option>
                                ))}
                              </Select>
                            </Form.Item>
                          }
                          className="rounded-lg h-12"
                          style={{ padding: 0 }}
                        />
                      </Form.Item>
                    </div>

                    <Form.Item className="mt-8 mb-0 flex justify-center">
                      <Button 
                        type="primary" 
                        htmlType="submit" 
                        loading={saving}
                        className="bg-navy hover:bg-navy-light text-white rounded-lg px-12 h-12 text-lg border-none shadow-md"
                      >
                        {t('profile:save')}
                      </Button>
                    </Form.Item>
                  </Form>
                </div>
              </TabPane>

              {/* TAB 2: SECURITY */}
              <TabPane 
                tab={<span className="px-4"><SafetyCertificateOutlined className="mr-2" /> {t('profile:security')}</span>} 
                key="2"
              >
                <div className="p-6 md:p-8 max-w-lg mx-auto">
                  <Form<PasswordFormValues>
                    form={passwordForm}
                    layout="vertical"
                    onFinish={onFinishPassword}
                    size="large"
                  >
                    <Form.Item
                      label={<span className="font-medium text-gray-700">{t('profile:oldPassword')}</span>}
                      name="oldPassword"
                      rules={[{ required: true, message: t('auth:errors.required', { field: t('profile:oldPassword') }) }]}
                    >
                      <Input.Password className="rounded-lg h-12" />
                    </Form.Item>

                    <Form.Item
                      label={<span className="font-medium text-gray-700">{t('profile:newPassword')}</span>}
                      name="newPassword"
                      rules={[
                        { required: true, message: t('auth:errors.required', { field: t('profile:newPassword') }) },
                        { min: 6, message: t('auth:errors.passwordLength', { min: 6 }) }
                      ]}
                    >
                      <Input.Password className="rounded-lg h-12" />
                    </Form.Item>

                    <Form.Item
                      label={<span className="font-medium text-gray-700">{t('profile:confirmNewPassword')}</span>}
                      name="confirmPassword"
                      dependencies={['newPassword']}
                      rules={[
                        { required: true, message: t('auth:errors.required', { field: t('profile:confirmNewPassword') }) },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('newPassword') === value) {
                              return Promise.resolve()
                            }
                            return Promise.reject(new Error(t('profile:passwordMismatch')))
                          },
                        }),
                      ]}
                    >
                      <Input.Password className="rounded-lg h-12" />
                    </Form.Item>

                    <Form.Item className="mt-8 mb-0 flex justify-center">
                      <Button 
                        type="primary" 
                        htmlType="submit" 
                        loading={saving}
                        className="bg-navy hover:bg-navy-light text-white rounded-lg px-12 h-12 text-lg border-none shadow-md"
                      >
                        {t('profile:changePassword')}
                      </Button>
                    </Form.Item>
                  </Form>
                </div>
              </TabPane>

            </Tabs>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
