import { axiosClient } from './axiosClient'
import { API_ENDPOINTS } from './endpoints'
import { env } from '../config/env'
import { bookingMockApi } from './mocks/booking.mock'
import type { Booking, CreateBookingPayload, ListBookingsQuery, MessageResponse, PagedResult, RejectBookingPayload } from './types'

const bookingRealApi = {
  create: async (data: CreateBookingPayload): Promise<Booking> => {
    const res = await axiosClient.post(API_ENDPOINTS.BOOKINGS, data)
    return res.data.data
  },
  listMine: async (query: ListBookingsQuery): Promise<PagedResult<Booking>> => {
    const res = await axiosClient.get(API_ENDPOINTS.BOOKINGS_ME, { params: query })
    return res.data.data
  },
  getById: async (id: string): Promise<Booking> => {
    const res = await axiosClient.get(API_ENDPOINTS.BOOKING_DETAIL(id))
    return res.data.data
  },
  cancel: async (id: string): Promise<MessageResponse> => {
    const res = await axiosClient.patch(API_ENDPOINTS.BOOKING_CANCEL(id))
    return res.data
  },

  // Admin
  adminList: async (query: ListBookingsQuery): Promise<PagedResult<Booking>> => {
    const res = await axiosClient.get(API_ENDPOINTS.ADMIN_BOOKINGS, { params: query })
    return res.data.data
  },
  adminGetById: async (id: string): Promise<Booking> => {
    const res = await axiosClient.get(API_ENDPOINTS.ADMIN_BOOKING_DETAIL(id))
    return res.data.data
  },
  accept: async (id: string): Promise<MessageResponse> => {
    const res = await axiosClient.patch(API_ENDPOINTS.ADMIN_BOOKING_ACCEPT(id))
    return res.data
  },
  reject: async (id: string, data: RejectBookingPayload): Promise<MessageResponse> => {
    const res = await axiosClient.patch(API_ENDPOINTS.ADMIN_BOOKING_REJECT(id), data)
    return res.data
  },
}

export const bookingApi = env.useMock ? bookingMockApi : bookingRealApi
