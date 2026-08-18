import { axiosClient } from './axiosClient'
import { API_ENDPOINTS } from './endpoints'

export const authApi = {
  login: async (_data: any) => {
    return new Promise(resolve => setTimeout(() => resolve({ accessToken: 'fake_mock_token' }), 500))
  },
  register: async (_data: any) => {
    return new Promise(resolve => setTimeout(() => resolve({ success: true }), 500))
  },
  forgotPassword: async (data: { email: string }) => {
    const res = await axiosClient.post(API_ENDPOINTS.AUTH_FORGOT_PASSWORD, data)
    return res.data
  },
  resetPassword: async (data: any, token: string) => {
    const res = await axiosClient.post(`${API_ENDPOINTS.AUTH_RESET_PASSWORD}?token=${token}`, data)
    return res.data
  },
}
