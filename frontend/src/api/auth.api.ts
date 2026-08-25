import { axiosClient } from './axiosClient'
import { API_ENDPOINTS } from './endpoints'
import { env } from '../config/env'
import { authMockApi } from './mocks/auth.mock'
import type {
  ActivatePayload,
  AuthMessageResponse,
  ForgotPasswordPayload,
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  RegisterResponse,
  ResetPasswordPayload,
} from './types'

const authRealApi = {
  login: async (data: LoginPayload): Promise<LoginResponse> => {
    const res = await axiosClient.post(API_ENDPOINTS.AUTH_LOGIN, data)
    return res.data
  },
  register: async (data: RegisterPayload): Promise<RegisterResponse> => {
    const res = await axiosClient.post(API_ENDPOINTS.AUTH_REGISTER, data)
    return res.data
  },
  activate: async (data: ActivatePayload): Promise<AuthMessageResponse> => {
    const res = await axiosClient.post(API_ENDPOINTS.AUTH_ACTIVATE, data)
    return res.data
  },
  forgotPassword: async (data: ForgotPasswordPayload): Promise<AuthMessageResponse> => {
    const res = await axiosClient.post(API_ENDPOINTS.AUTH_FORGOT_PASSWORD, data)
    return res.data
  },
  resetPassword: async (data: ResetPasswordPayload): Promise<AuthMessageResponse> => {
    const res = await axiosClient.post(API_ENDPOINTS.AUTH_RESET_PASSWORD, data)
    return res.data
  },
  // Thu hoi token phia BE (Redis blacklist qua TokenUtil.revokeAuthToken) -
  // PHAI goi truoc khi xoa token o localStorage, khong thi BE khong con biet
  // token nao de thu hoi (interceptor lay Bearer token tu localStorage).
  logout: async (): Promise<MessageResponse> => {
    const res = await axiosClient.post(API_ENDPOINTS.AUTH_LOGOUT)
    return res.data
  },
}

export const authApi = env.useMock ? authMockApi : authRealApi
