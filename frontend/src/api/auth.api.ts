import { axiosClient } from './axiosClient'
import { API_ENDPOINTS } from './endpoints'
import { env } from '../config/env'
import { authMockApi } from './mocks/auth.mock'
import type {
  ActivatePayload,
  ForgotPasswordPayload,
  LoginPayload,
  LoginResponse,
  MessageResponse,
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
  activate: async (data: ActivatePayload): Promise<MessageResponse> => {
    const res = await axiosClient.post(API_ENDPOINTS.AUTH_ACTIVATE, data)
    return res.data
  },
  forgotPassword: async (data: ForgotPasswordPayload): Promise<MessageResponse> => {
    const res = await axiosClient.post(API_ENDPOINTS.AUTH_FORGOT_PASSWORD, data)
    return res.data
  },
  resetPassword: async (data: ResetPasswordPayload): Promise<MessageResponse> => {
    const res = await axiosClient.post(API_ENDPOINTS.AUTH_RESET_PASSWORD, data)
    return res.data
  },
}

export const authApi = env.useMock ? authMockApi : authRealApi
