import type { AdminUpdateUserPayload, AdminUserListItem, ListAdminUsersQuery, PagedResult } from '../types'

const MOCK_DELAY_MS = 350

function mockDelay<T>(data: T, ms = MOCK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

function paginate<T>(items: T[], page = 1, limit = 10): PagedResult<T> {
  const start = (page - 1) * limit
  return { items: items.slice(start, start + limit), total: items.length, page, limit, totalPages: Math.max(1, Math.ceil(items.length / limit)) }
}

let users: AdminUserListItem[] = [
  { id: 'u1', username: 'alexjohnson', email: 'alex.johnson@email.com', fullName: 'Alex Johnson', phone: '+1 (555) 234-5678', avatarUrl: null, role: 'USER', status: 'ACTIVE', createdAt: '2025-03-15T00:00:00Z' },
  { id: 'u2', username: 'iromano', email: 'i.romano@mail.com', fullName: 'Isabella Romano', phone: '+39 02 1234 5678', avatarUrl: null, role: 'USER', status: 'ACTIVE', createdAt: '2025-06-22T00:00:00Z' },
  { id: 'u3', username: 'mchen', email: 'mchen@corp.com', fullName: 'Marcus Chen', phone: '+65 9123 4567', avatarUrl: null, role: 'USER', status: 'ACTIVE', createdAt: '2025-01-08T00:00:00Z' },
  { id: 'u4', username: 'slaurent', email: 'slaurent@fr.com', fullName: 'Sophie Laurent', phone: '+33 1 2345 6789', avatarUrl: null, role: 'USER', status: 'INACTIVE', createdAt: '2024-11-30T00:00:00Z' },
  { id: 'u5', username: 'jwhitfield', email: 'j.whitfield@email.com', fullName: 'James Whitfield', phone: '+44 20 7946 0958', avatarUrl: null, role: 'USER', status: 'ACTIVE', createdAt: '2024-09-14T00:00:00Z' },
  { id: 'admin1', username: 'admin', email: 'admin@grandeur.com', fullName: 'Hotel Admin', phone: '+1 (800) 555-0001', avatarUrl: null, role: 'ADMIN', status: 'ACTIVE', createdAt: '2023-01-01T00:00:00Z' },
]

export const adminUserMockApi = {
  list: async (query: ListAdminUsersQuery): Promise<PagedResult<AdminUserListItem>> => {
    let filtered = users
    if (query.status) filtered = filtered.filter((u) => u.status === query.status)
    if (query.role) filtered = filtered.filter((u) => u.role === query.role)
    if (query.search) {
      const q = query.search.toLowerCase()
      filtered = filtered.filter((u) => (u.fullName ?? '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    }
    return mockDelay(paginate(filtered, query.page, query.limit))
  },
  getById: async (id: string): Promise<AdminUserListItem> => {
    const user = users.find((u) => u.id === id)
    if (!user) throw new Error('User not found (mock).')
    return mockDelay(user)
  },
  update: async (id: string, data: AdminUpdateUserPayload): Promise<AdminUserListItem> => {
    users = users.map((u) => (u.id === id ? { ...u, ...data } : u))
    return mockDelay(users.find((u) => u.id === id)!)
  },
}
