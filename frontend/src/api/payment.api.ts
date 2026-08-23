import { axiosClient } from './axiosClient'
import { API_ENDPOINTS } from './endpoints'
import { env } from '../config/env'
import { paymentMockApi } from './mocks/payment.mock'
import type { AdminPayment, ListAdminPaymentsQuery, PagedResult } from './types'

const paymentRealApi = {
  adminList: async (query: ListAdminPaymentsQuery): Promise<PagedResult<AdminPayment>> => {
    const res = await axiosClient.get(API_ENDPOINTS.ADMIN_PAYMENTS, { params: query })
    return res.data.data
  },
}

export const paymentApi = env.useMock ? paymentMockApi : paymentRealApi
