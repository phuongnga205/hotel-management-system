import { axiosClient } from './axiosClient'
import { API_ENDPOINTS } from './endpoints'
import { env } from '../config/env'
import { userMockApi } from './mocks/user.mock'
import type { ChangePasswordPayload, MessageResponse, UpdateProfilePayload, UserProfile } from './types'

export type { UserProfile } from './types'

const userRealApi = {
  getProfile: async (): Promise<UserProfile> => {
    const res = await axiosClient.get(API_ENDPOINTS.USERS_ME)
    return res.data
  },
  updateProfile: async (data: UpdateProfilePayload): Promise<UserProfile> => {
    const res = await axiosClient.patch(API_ENDPOINTS.USERS_ME, data)
    return res.data
  },
  changePassword: async (data: ChangePasswordPayload): Promise<MessageResponse> => {
    const res = await axiosClient.patch(API_ENDPOINTS.USERS_ME_PASSWORD, data)
    return res.data
  },
}

export const userApi = env.useMock ? userMockApi : userRealApi
