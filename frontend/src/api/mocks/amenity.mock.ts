import type { Amenity, CreateAmenityPayload, MessageResponse, UpdateAmenityPayload } from '../types'

const MOCK_DELAY_MS = 300

function mockDelay<T>(data: T, ms = MOCK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

const SEED_TIMESTAMP = '2026-01-01T00:00:00Z'

// Export de room.mock.ts tra cuu ten amenity khi gan vao phong (2 mock file
// dung chung 1 catalog, giong that - amenities la danh muc dung chung cho
// moi phong, khong rieng tung phong).
export let amenityCatalog: Amenity[] = [
  { id: 'a1', name: 'Free Wi-Fi', description: 'High-speed internet access throughout the hotel', createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP },
  { id: 'a2', name: 'Air Conditioning', description: null, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP },
  { id: 'a3', name: 'Mini Bar', description: null, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP },
  { id: 'a4', name: 'Balcony', description: null, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP },
  { id: 'a5', name: 'Bathtub', description: null, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP },
  { id: 'a6', name: 'Jacuzzi', description: null, createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP },
]

export const amenityMockApi = {
  list: async (): Promise<Amenity[]> => mockDelay(amenityCatalog),
  create: async (data: CreateAmenityPayload): Promise<Amenity> => {
    const now = new Date().toISOString()
    const amenity: Amenity = { id: String(Date.now()), name: data.name, description: data.description ?? null, createdAt: now, updatedAt: now }
    amenityCatalog = [...amenityCatalog, amenity]
    return mockDelay(amenity)
  },
  update: async (id: string, data: UpdateAmenityPayload): Promise<Amenity> => {
    amenityCatalog = amenityCatalog.map((a) => (a.id === id ? { ...a, ...data, updatedAt: new Date().toISOString() } : a))
    return mockDelay(amenityCatalog.find((a) => a.id === id)!)
  },
  remove: async (id: string): Promise<MessageResponse> => {
    amenityCatalog = amenityCatalog.filter((a) => a.id !== id)
    return mockDelay({ message: 'Amenity deleted (mock).' })
  },
}
