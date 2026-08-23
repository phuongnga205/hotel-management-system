import { axiosClient } from './axiosClient'
import { API_ENDPOINTS } from './endpoints'
import { env } from '../config/env'
import { roomMockApi } from './mocks/room.mock'
import type {
  CreateRoomPayload,
  ListRoomsQuery,
  MessageResponse,
  PagedResult,
  Room,
  RoomImage,
  UpdateRoomPayload,
} from './types'

const roomRealApi = {
  // Cong khai, khong can dang nhap - luon loc status=ACTIVE.
  listPublic: async (query: ListRoomsQuery): Promise<PagedResult<Room>> => {
    const res = await axiosClient.get(API_ENDPOINTS.ROOMS, { params: query })
    return res.data.data
  },
  getPublicById: async (id: string): Promise<Room> => {
    const res = await axiosClient.get(API_ENDPOINTS.ROOM_DETAIL(id))
    return res.data.data
  },

  // Admin - JWT + role ADMIN.
  adminList: async (query: ListRoomsQuery): Promise<PagedResult<Room>> => {
    const res = await axiosClient.get(API_ENDPOINTS.ADMIN_ROOMS, { params: query })
    return res.data.data
  },
  adminGetById: async (id: string): Promise<Room> => {
    const res = await axiosClient.get(API_ENDPOINTS.ADMIN_ROOM_DETAIL(id))
    return res.data.data
  },
  create: async (data: CreateRoomPayload): Promise<Room> => {
    const res = await axiosClient.post(API_ENDPOINTS.ADMIN_ROOMS, data)
    return res.data.data
  },
  update: async (id: string, data: UpdateRoomPayload): Promise<Room> => {
    const res = await axiosClient.patch(API_ENDPOINTS.ADMIN_ROOM_DETAIL(id), data)
    return res.data.data
  },
  remove: async (id: string): Promise<MessageResponse> => {
    const res = await axiosClient.delete(API_ENDPOINTS.ADMIN_ROOM_DETAIL(id))
    return res.data
  },
  addImage: async (roomId: string, file: File, isThumbnail = false): Promise<RoomImage> => {
    const form = new FormData()
    form.append('file', file)
    form.append('isThumbnail', String(isThumbnail))
    const res = await axiosClient.post(API_ENDPOINTS.ADMIN_ROOM_IMAGES(roomId), form)
    return res.data.data
  },
  removeImage: async (roomId: string, imageId: string): Promise<MessageResponse> => {
    const res = await axiosClient.delete(API_ENDPOINTS.ADMIN_ROOM_IMAGE_DETAIL(roomId, imageId))
    return res.data
  },
  setThumbnail: async (roomId: string, imageId: string): Promise<MessageResponse> => {
    const res = await axiosClient.patch(API_ENDPOINTS.ADMIN_ROOM_IMAGE_THUMBNAIL(roomId, imageId))
    return res.data
  },
  addAmenities: async (roomId: string, amenityIds: string[]): Promise<MessageResponse> => {
    const res = await axiosClient.post(API_ENDPOINTS.ADMIN_ROOM_AMENITIES(roomId), { amenityIds })
    return res.data
  },
  removeAmenity: async (roomId: string, amenityId: string): Promise<MessageResponse> => {
    const res = await axiosClient.delete(API_ENDPOINTS.ADMIN_ROOM_AMENITY_DETAIL(roomId, amenityId))
    return res.data
  },
}

export const roomApi = env.useMock ? roomMockApi : roomRealApi
