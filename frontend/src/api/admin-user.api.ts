import { axiosClient } from './axiosClient'
import { API_ENDPOINTS } from './endpoints'
import { env } from '../config/env'
import { adminUserMockApi } from './mocks/admin-user.mock'
import type { AdminCreateUserPayload, AdminUpdateUserPayload, AdminUserListItem, ListAdminUsersQuery, PagedResult } from './types'

const adminUserRealApi = {
  list: async (query: ListAdminUsersQuery): Promise<PagedResult<AdminUserListItem>> => {
    const res = await axiosClient.get(API_ENDPOINTS.ADMIN_USERS, { params: query })
    return res.data.data
  },
  // Tao tai khoan moi, luon ACTIVE ngay (BE tu set, khong nhan status tu FE -
  // xem backend/src/users/admin-users.controller.ts).
  create: async (data: AdminCreateUserPayload): Promise<AdminUserListItem> => {
    const res = await axiosClient.post(API_ENDPOINTS.ADMIN_USERS, data)
    return res.data.data
  },
  getById: async (id: string): Promise<AdminUserListItem> => {
    const res = await axiosClient.get(API_ENDPOINTS.ADMIN_USER_DETAIL(id))
    return res.data.data
  },
  update: async (id: string, data: AdminUpdateUserPayload): Promise<AdminUserListItem> => {
    const res = await axiosClient.patch(API_ENDPOINTS.ADMIN_USER_DETAIL(id), data)
    return res.data.data
  },
}

export const adminUserApi = env.useMock ? adminUserMockApi : adminUserRealApi
