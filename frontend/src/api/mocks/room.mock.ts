/**
 * Mock cho Room API (public + admin) - dung khi env.useMock === true.
 * Nguon fixture DUY NHAT cho rooms; khong import truc tiep tu page/component
 * nao khac ngoai room.api.ts.
 */
import type {
  CreateRoomPayload,
  ListRoomsQuery,
  MessageResponse,
  PagedResult,
  Room,
  RoomImage,
  UpdateRoomPayload,
} from '../types'
import { amenityCatalog } from './amenity.mock'

const MOCK_DELAY_MS = 400

function mockDelay<T>(data: T, ms = MOCK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

const SEED_TIMESTAMP = '2026-01-01T00:00:00Z'

let rooms: Room[] = [
  {
    id: '1',
    roomNumber: '101',
    name: 'Grand Deluxe King',
    roomType: 'Deluxe King',
    description: 'Spacious room with king bed and city skyline view.',
    viewType: 'CITY_VIEW',
    capacity: 2,
    pricePerNight: 320,
    status: 'ACTIVE',
    amenities: [
      { id: 'a1', name: 'Free Wi-Fi' },
      { id: 'a2', name: 'Air Conditioning' },
      { id: 'a3', name: 'Mini Bar' },
    ],
    images: [{ id: 'img1', roomId: '1', imageUrl: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800', isThumbnail: true, createdAt: SEED_TIMESTAMP }],
  },
  {
    id: '2',
    roomNumber: '202',
    name: 'Ocean View Suite',
    roomType: 'Suite',
    description: 'Elegant suite overlooking the ocean with a private balcony.',
    viewType: 'SEA_VIEW',
    capacity: 3,
    pricePerNight: 480,
    status: 'ACTIVE',
    amenities: [
      { id: 'a1', name: 'Free Wi-Fi' },
      { id: 'a4', name: 'Balcony' },
      { id: 'a5', name: 'Bathtub' },
    ],
    images: [{ id: 'img2', roomId: '2', imageUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800', isThumbnail: true, createdAt: SEED_TIMESTAMP }],
  },
  {
    id: '3',
    roomNumber: '305',
    name: 'Garden Twin Room',
    roomType: 'Standard Twin',
    description: 'Cozy twin room facing the hotel garden.',
    viewType: 'GARDEN_VIEW',
    capacity: 2,
    pricePerNight: 180,
    status: 'ACTIVE',
    amenities: [{ id: 'a1', name: 'Free Wi-Fi' }, { id: 'a2', name: 'Air Conditioning' }],
    images: [{ id: 'img3', roomId: '3', imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800', isThumbnail: true, createdAt: SEED_TIMESTAMP }],
  },
  {
    id: '4',
    roomNumber: '410',
    name: 'Penthouse Executive',
    roomType: 'Penthouse',
    description: 'Top-floor penthouse with panoramic city view and lounge area.',
    viewType: 'CITY_VIEW',
    capacity: 4,
    pricePerNight: 950,
    status: 'MAINTENANCE',
    amenities: [
      { id: 'a1', name: 'Free Wi-Fi' },
      { id: 'a4', name: 'Balcony' },
      { id: 'a6', name: 'Jacuzzi' },
    ],
    images: [{ id: 'img4', roomId: '4', imageUrl: 'https://images.unsplash.com/photo-1590490359683-658d3d23f972?w=800', isThumbnail: true, createdAt: SEED_TIMESTAMP }],
  },
  {
    id: '5',
    roomNumber: '118',
    name: 'Classic Single',
    roomType: 'Single',
    description: 'Compact and comfortable room for solo travelers.',
    viewType: null,
    capacity: 1,
    pricePerNight: 120,
    status: 'INACTIVE',
    amenities: [{ id: 'a1', name: 'Free Wi-Fi' }],
    images: [{ id: 'img5', roomId: '5', imageUrl: 'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800', isThumbnail: true, createdAt: SEED_TIMESTAMP }],
  },
]

function paginate<T>(items: T[], query: ListQueryLike): PagedResult<T> {
  const page = query.page ?? 1
  const limit = query.limit ?? 10
  const start = (page - 1) * limit
  const pageItems = items.slice(start, start + limit)
  return { items: pageItems, total: items.length, page, limit, totalPages: Math.max(1, Math.ceil(items.length / limit)) }
}

interface ListQueryLike {
  page?: number
  limit?: number
}

function nextId(): string {
  return String(Date.now())
}

export const roomMockApi = {
  listPublic: async (query: ListRoomsQuery): Promise<PagedResult<Room>> => {
    const active = rooms.filter((r) => r.status === 'ACTIVE')
    return mockDelay(paginate(active, query))
  },
  getPublicById: async (id: string): Promise<Room> => {
    const room = rooms.find((r) => r.id === id && r.status === 'ACTIVE')
    if (!room) throw new Error('Room not found (mock).')
    return mockDelay(room)
  },
  adminList: async (query: ListRoomsQuery): Promise<PagedResult<Room>> => {
    let filtered = rooms
    if (query.status) filtered = filtered.filter((r) => r.status === query.status)
    if (query.search) {
      const q = query.search.toLowerCase()
      filtered = filtered.filter((r) => r.name.toLowerCase().includes(q) || r.roomType.toLowerCase().includes(q) || r.roomNumber.includes(q))
    }
    return mockDelay(paginate(filtered, query))
  },
  adminGetById: async (id: string): Promise<Room> => {
    const room = rooms.find((r) => r.id === id)
    if (!room) throw new Error('Room not found (mock).')
    return mockDelay(room)
  },
  create: async (data: CreateRoomPayload): Promise<Room> => {
    const amenityIds = data.amenityIds ?? []
    const room: Room = {
      id: nextId(),
      roomNumber: data.roomNumber,
      name: data.name,
      roomType: data.roomType,
      description: data.description ?? null,
      viewType: data.viewType ?? null,
      capacity: data.capacity,
      pricePerNight: data.pricePerNight,
      status: 'ACTIVE',
      amenities: amenityCatalog.filter((a) => amenityIds.includes(a.id)).map(({ id, name }) => ({ id, name })),
      images: [],
    }
    rooms = [room, ...rooms]
    return mockDelay(room)
  },
  update: async (id: string, data: UpdateRoomPayload): Promise<Room> => {
    rooms = rooms.map((r) => (r.id === id ? { ...r, ...data } : r))
    const updated = rooms.find((r) => r.id === id)!
    return mockDelay(updated)
  },
  remove: async (id: string): Promise<MessageResponse> => {
    rooms = rooms.filter((r) => r.id !== id)
    return mockDelay({ message: 'Room deleted (mock).' })
  },
  addImage: async (roomId: string, file: File, isThumbnail = false): Promise<RoomImage> => {
    const image: RoomImage = { id: nextId(), roomId, imageUrl: URL.createObjectURL(file), isThumbnail, createdAt: new Date().toISOString() }
    rooms = rooms.map((r) =>
      r.id === roomId
        ? { ...r, images: [...(isThumbnail ? (r.images ?? []).map((i) => ({ ...i, isThumbnail: false })) : (r.images ?? [])), image] }
        : r,
    )
    return mockDelay(image)
  },
  removeImage: async (roomId: string, imageId: string): Promise<MessageResponse> => {
    rooms = rooms.map((r) => (r.id === roomId ? { ...r, images: (r.images ?? []).filter((i) => i.id !== imageId) } : r))
    return mockDelay({ message: 'Image removed (mock).' })
  },
  setThumbnail: async (roomId: string, imageId: string): Promise<MessageResponse> => {
    rooms = rooms.map((r) =>
      r.id === roomId
        ? { ...r, images: (r.images ?? []).map((i) => ({ ...i, isThumbnail: i.id === imageId })) }
        : r,
    )
    return mockDelay({ message: 'Thumbnail updated (mock).' })
  },
  addAmenities: async (roomId: string, amenityIds: string[]): Promise<MessageResponse> => {
    rooms = rooms.map((r) => {
      if (r.id !== roomId) return r
      const existingIds = new Set((r.amenities ?? []).map((a) => a.id))
      const newOnes = amenityCatalog.filter((a) => amenityIds.includes(a.id) && !existingIds.has(a.id)).map(({ id, name }) => ({ id, name }))
      return { ...r, amenities: [...(r.amenities ?? []), ...newOnes] }
    })
    return mockDelay({ message: 'Amenities added (mock).' })
  },
  removeAmenity: async (roomId: string, amenityId: string): Promise<MessageResponse> => {
    rooms = rooms.map((r) => (r.id === roomId ? { ...r, amenities: (r.amenities ?? []).filter((a) => a.id !== amenityId) } : r))
    return mockDelay({ message: 'Amenity removed (mock).' })
  },
}
