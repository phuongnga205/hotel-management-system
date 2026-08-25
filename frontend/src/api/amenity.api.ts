import { axiosClient } from './axiosClient'
import { API_ENDPOINTS } from './endpoints'
import { env } from '../config/env'
import { amenityMockApi } from './mocks/amenity.mock'
import type { Amenity, CreateAmenityPayload, MessageResponse, UpdateAmenityPayload } from './types'

// BE tra ve object phan trang { items, total, page, limit, totalPages }
const AMENITY_LIST_ALL_LIMIT = 100

const amenityRealApi = {
  list: async (): Promise<Amenity[]> => {
    const res = await axiosClient.get(API_ENDPOINTS.AMENITIES, { params: { limit: AMENITY_LIST_ALL_LIMIT } })
    return res.data.data.items
  },
  create: async (data: CreateAmenityPayload): Promise<Amenity> => {
    const res = await axiosClient.post(API_ENDPOINTS.AMENITIES, data)
    return res.data.data
  },
  update: async (id: string, data: UpdateAmenityPayload): Promise<Amenity> => {
    const res = await axiosClient.patch(API_ENDPOINTS.AMENITY_DETAIL(id), data)
    return res.data.data
  },
  remove: async (id: string): Promise<MessageResponse> => {
    const res = await axiosClient.delete(API_ENDPOINTS.AMENITY_DETAIL(id))
    return res.data
  },
}

export const amenityApi = env.useMock ? amenityMockApi : amenityRealApi
