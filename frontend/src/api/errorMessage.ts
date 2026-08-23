import axios from 'axios'

export function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string | string[] } | undefined)?.message
    if (Array.isArray(message)) return message[0] ?? fallback
    if (typeof message === 'string' && message.length > 0) return message
  }
  return fallback
}


export function getErrorStatusCode(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}
