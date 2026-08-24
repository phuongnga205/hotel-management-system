import type { EmailLog, ListEmailLogsQuery, MessageResponse, PagedResult } from '../types'

const MOCK_DELAY_MS = 350

function mockDelay<T>(data: T, ms = MOCK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

function paginate<T>(items: T[], page = 1, limit = 10): PagedResult<T> {
  const start = (page - 1) * limit
  return { items: items.slice(start, start + limit), total: items.length, page, limit, totalPages: Math.max(1, Math.ceil(items.length / limit)) }
}

let logs: EmailLog[] = [
  { id: 'el1', type: 'booking-status-changed', status: 'SENT', recipient: 'alex.johnson@email.com', sentAt: '2026-08-18T10:22:00Z', lastError: null, retryCount: 0, createdAt: '2026-08-18T10:21:45Z' },
  { id: 'el2', type: 'account-activation', status: 'SENT', recipient: 'i.romano@mail.com', sentAt: '2026-08-17T16:45:00Z', lastError: null, retryCount: 0, createdAt: '2026-08-17T16:44:55Z' },
  { id: 'el3', type: 'password-reset', status: 'FAILED', recipient: 'mchen@corp.com', sentAt: null, lastError: 'SMTP timeout', retryCount: 2, createdAt: '2026-08-16T09:09:52Z' },
  { id: 'el4', type: 'review-deleted', status: 'SENT', recipient: 'slaurent@fr.com', sentAt: '2026-08-15T14:30:00Z', lastError: null, retryCount: 0, createdAt: '2026-08-15T14:29:50Z' },
  { id: 'el5', type: 'account-activation', status: 'PENDING', recipient: 'j.whitfield@email.com', sentAt: null, lastError: null, retryCount: 0, createdAt: '2026-08-15T11:00:00Z' },
  { id: 'el6', type: 'booking-status-changed', status: 'FAILED', recipient: 'alex.johnson@email.com', sentAt: null, lastError: 'Recipient mailbox full', retryCount: 3, createdAt: '2026-08-14T07:59:48Z' },
]

export const emailLogMockApi = {
  list: async (query: ListEmailLogsQuery): Promise<PagedResult<EmailLog>> => {
    const filtered = query.status ? logs.filter((l) => l.status === query.status) : logs
    return mockDelay(paginate(filtered, query.page, query.limit))
  },
  getById: async (id: string): Promise<EmailLog> => {
    const log = logs.find((l) => l.id === id)
    if (!log) throw new Error('Email log not found (mock).')
    return mockDelay(log)
  },
  retry: async (id: string): Promise<MessageResponse> => {
    logs = logs.map((l) => (l.id === id ? { ...l, status: 'SENT', sentAt: new Date().toISOString(), lastError: null } : l))
    return mockDelay({ message: 'Email resent (mock).' })
  },
}
