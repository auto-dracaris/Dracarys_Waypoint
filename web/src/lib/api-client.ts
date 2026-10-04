import { API_BASE_URL } from './api-endpoints'

export class ApiError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  params?: Record<string, string | number | boolean | undefined>
  body?: unknown
  token?: string | null
}

// List endpoints put `{ items, meta }` in `data`.
export interface Paginated<T> {
  items: T[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

let onUnauthorized: (() => void) | undefined

// The session owner (UserProvider) registers how to react to a rejected token.
export function setUnauthorizedHandler(handler: (() => void) | undefined): void {
  onUnauthorized = handler
}

function withParams(path: string, params: RequestOptions['params']): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) if (value !== undefined) query.set(key, String(value))
  return query.size ? `${path}?${query}` : path
}

// Every API response is `{ statusCode, message, data }`, errors included.
// ponytail: a rejected token signs the user out; rotate it via /auth/refresh here if day-long access tokens get shorter.
export async function apiRequest<T = unknown>(path: string, { method = 'GET', params, body, token }: RequestOptions = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${withParams(path, params)}`, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Could not reach the server. Please try again.', 0)
  }

  const json = await res.json().catch(() => null)
  if (res.status === 401 && token) onUnauthorized?.()
  if (!res.ok) throw new ApiError(json?.message ?? 'Something went wrong.', res.status)
  return json?.data as T
}
