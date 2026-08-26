import { axiosClient } from './axiosClient'
import { API_ENDPOINTS } from './endpoints'
import { env } from '../config/env'
import { statisticsMockApi } from './mocks/statistics.mock'
import type { RevenueBookingsStatistics, StatisticsQuery } from './types'

const statisticsRealApi = {
  // Khac cac module khac (Users/Rooms/...) - endpoint nay tra thang
  // StatisticsResponseDto o top-level, KHONG boc trong {statusCode,message,
  // data} (xem statistics.service.ts toResponse()) - da kiem chung truc tiep
  // qua API that, khong duoc "sua lai" thanh res.data.data giong noi khac.
  getRevenueAndBookings: async (query: StatisticsQuery): Promise<RevenueBookingsStatistics> => {
    const res = await axiosClient.get(API_ENDPOINTS.STATISTICS_REVENUE_BOOKINGS, { params: query })
    return res.data
  },
  exportRevenueAndBookings: async (query: StatisticsQuery): Promise<Blob> => {
    const res = await axiosClient.get(API_ENDPOINTS.STATISTICS_REVENUE_BOOKINGS_EXPORT, {
      params: query,
      responseType: 'blob',
    })
    return res.data
  },
}

export const statisticsApi = env.useMock ? statisticsMockApi : statisticsRealApi
