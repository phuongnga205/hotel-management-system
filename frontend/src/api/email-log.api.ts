import { axiosClient } from './axiosClient'
import { API_ENDPOINTS } from './endpoints'
import { env } from '../config/env'
import { emailLogMockApi } from './mocks/email-log.mock'
import type { EmailLog, ListEmailLogsQuery, MessageResponse, PagedResult } from './types'

const emailLogRealApi = {
  list: async (query: ListEmailLogsQuery): Promise<PagedResult<EmailLog>> => {
    const res = await axiosClient.get(API_ENDPOINTS.ADMIN_EMAIL_LOGS, { params: query })
    return res.data.data
  },
  getById: async (id: string): Promise<EmailLog> => {
    const res = await axiosClient.get(API_ENDPOINTS.ADMIN_EMAIL_LOG_DETAIL(id))
    return res.data.data
  },
  retry: async (id: string): Promise<MessageResponse> => {
    const res = await axiosClient.post(API_ENDPOINTS.ADMIN_EMAIL_LOG_RETRY(id))
    return res.data
  },
}

export const emailLogApi = env.useMock ? emailLogMockApi : emailLogRealApi
