import { axiosClient } from './axiosClient'
import { API_ENDPOINTS } from './endpoints'
import { env } from '../config/env'
import { reviewMockApi } from './mocks/review.mock'
import type { ListReviewsQuery, MessageResponse, PagedResult, Review } from './types'

const reviewRealApi = {
  create: async (bookingId: string, rating: number, comment?: string): Promise<Review> => {
    const res = await axiosClient.post(API_ENDPOINTS.REVIEWS, { bookingId, rating, comment })
    return res.data.data
  },
  // Cong khai, khong can dang nhap - dung cho trang chi tiet phong hien
  // thi review. Da implement o BE (backend/docs/DANH_SACH_API.md muc 5),
  // nhung TODO: chua co page nao goi ham nay - xem
  // frontend/docs/DANH_SACH_MAN_HINH.md muc C.
  listByRoom: async (roomId: string, query: ListReviewsQuery): Promise<PagedResult<Review>> => {
    const res = await axiosClient.get(API_ENDPOINTS.ROOM_REVIEWS(roomId), { params: query })
    return res.data.data
  },
  adminList: async (query: ListReviewsQuery): Promise<PagedResult<Review>> => {
    const res = await axiosClient.get(API_ENDPOINTS.ADMIN_REVIEWS, { params: query })
    return res.data.data
  },
  // Khong nhan body/ly do - BE (AdminReviewsController.remove()) chi doc
  // :id tren path, khong doc @Body() nao ca; email thong bao cho user dung
  // 1 template co dinh, khong co phan ly do tuy chinh tu Admin (xem
  // backend/docs/DANH_SACH_API.md muc 10).
  adminRemove: async (id: string): Promise<MessageResponse> => {
    const res = await axiosClient.delete(API_ENDPOINTS.ADMIN_REVIEW_DETAIL(id))
    return res.data
  },
}

export const reviewApi = env.useMock ? reviewMockApi : reviewRealApi
