import { axiosClient } from './axiosClient'
import { API_ENDPOINTS } from './endpoints'
import { env } from '../config/env'
import { amenityMockApi } from './mocks/amenity.mock'
import type { Amenity, CreateAmenityPayload, ListAmenitiesQuery, MessageResponse, PagedResult, UpdateAmenityPayload } from './types'

// BE tra ve object phan trang { items, total, page, limit, totalPages }
const AMENITY_LIST_ALL_LIMIT = 100

const amenityRealApi = {
  // Lay het catalogue (khong phan trang) - dung cho cac noi chi can list tho
  // de dung checkbox/filter (form tao/sua phong, bo loc RoomListPage...),
  // KHONG dung cho trang quan ly amenities (dung adminList ben duoi).
  list: async (): Promise<Amenity[]> => {
    const res = await axiosClient.get(API_ENDPOINTS.AMENITIES, { params: { limit: AMENITY_LIST_ALL_LIMIT } })
    return res.data.data.items
  },
  // Co phan trang + search (ten tien nghi) - dung rieng cho
  // AdminAmenityListPage, khac list() o tren.
  adminList: async (query: ListAmenitiesQuery): Promise<PagedResult<Amenity>> => {
    const res = await axiosClient.get(API_ENDPOINTS.AMENITIES, { params: query })
    return res.data.data
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
