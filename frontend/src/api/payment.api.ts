import { axiosClient } from './axiosClient'
import { API_ENDPOINTS } from './endpoints'
import { env } from '../config/env'
import { paymentMockApi } from './mocks/payment.mock'
import type { AdminPayment, ListAdminPaymentsQuery, ListPaymentsQuery, PagedResult, UserPayment } from './types'

const paymentRealApi = {
  // Self-service - GET /payments/me, gop giao dich cua chinh user hien tai
  // tu moi booking ho tung co (khong scope theo 1 booking cu the).
  listMine: async (query: ListPaymentsQuery): Promise<PagedResult<UserPayment>> => {
    const res = await axiosClient.get(API_ENDPOINTS.PAYMENTS_ME, { params: query })
    return res.data.data
  },
  adminList: async (query: ListAdminPaymentsQuery): Promise<PagedResult<AdminPayment>> => {
    const res = await axiosClient.get(API_ENDPOINTS.ADMIN_PAYMENTS, { params: query })
    return res.data.data
  },
}

export const paymentApi = env.useMock ? paymentMockApi : paymentRealApi
