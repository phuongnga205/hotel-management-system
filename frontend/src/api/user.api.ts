import { axiosClient } from './axiosClient'
import { API_ENDPOINTS } from './endpoints'
import { env } from '../config/env'
import { userMockApi } from './mocks/user.mock'
import type { ChangePasswordPayload, MessageResponse, UpdateProfilePayload, UserProfile } from './types'

export type { UserProfile } from './types'

const userRealApi = {
  getProfile: async (): Promise<UserProfile> => {
    const res = await axiosClient.get(API_ENDPOINTS.USERS_ME)
    return res.data.data
  },
  updateProfile: async (data: UpdateProfilePayload): Promise<UserProfile> => {
    const res = await axiosClient.patch(API_ENDPOINTS.USERS_ME, data)
    return res.data.data
  },
  changePassword: async (data: ChangePasswordPayload): Promise<MessageResponse> => {
    const res = await axiosClient.patch(API_ENDPOINTS.USERS_ME_PASSWORD, data)
    return res.data
  },
  // multipart/form-data, field ten "file" (khop FileInterceptor('file') o BE) -
  // axiosClient KHONG set cung Content-Type nen axios tu suy ra multipart tu
  // FormData, khong can tu set header thu cong.
  uploadAvatar: async (file: File): Promise<UserProfile> => {
    const form = new FormData()
    form.append('file', file)
    const res = await axiosClient.post(API_ENDPOINTS.USERS_ME_AVATAR, form)
    return res.data.data
  },
  removeAvatar: async (): Promise<MessageResponse> => {
    const res = await axiosClient.delete(API_ENDPOINTS.USERS_ME_AVATAR)
    return res.data
  },
}

export const userApi = env.useMock ? userMockApi : userRealApi
