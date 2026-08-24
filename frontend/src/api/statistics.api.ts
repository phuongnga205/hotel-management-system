import { axiosClient } from './axiosClient'
import { API_ENDPOINTS } from './endpoints'
import { env } from '../config/env'
import { statisticsMockApi } from './mocks/statistics.mock'
import type { BookingStatistics, RevenueStatistics } from './types'

const statisticsRealApi = {
  bookings: async (): Promise<BookingStatistics> => {
    const res = await axiosClient.get(API_ENDPOINTS.ADMIN_STATISTICS_BOOKINGS)
    return res.data.data
  },
  revenue: async (): Promise<RevenueStatistics> => {
    const res = await axiosClient.get(API_ENDPOINTS.ADMIN_STATISTICS_REVENUE)
    return res.data.data
  },
}

export const statisticsApi = env.useMock ? statisticsMockApi : statisticsRealApi
