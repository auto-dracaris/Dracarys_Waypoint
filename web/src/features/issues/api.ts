import { apiRequest, type Paginated } from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/api-endpoints'

export interface Issue {
  id: string
  type: string
  title: string
  status: 'open' | 'acknowledged' | 'resolved'
  description: string
  affectedCases: number | null
  recordedAt: string
  createdAt: string
  reportedBy: { id: number; name: string; role: string } | null
  order: { reference: string; cases: number; outlet: { uniqueId: string; name: string } | null } | null
  trip: { id: string; tripNo: number; serviceDate: string; vehicle: string | null } | null
  photoUrl: string | null
  resolvedBy: { id: number; name: string } | null
  resolvedAt: string | null
  resolutionNote: string | null
}

// The existing endpoint has no summary, text search, or sort parameters.
// Read every page so local filtering and counts cover the complete result set.
export async function fetchIssues(token: string): Promise<Issue[]> {
  const first = await apiRequest<Paginated<Issue>>(API_ENDPOINTS.issues.list, { token, params: { page: 1, limit: 200 } })
  const items = [...first.items]
  for (let page = 2; page <= first.meta.totalPages; page++) {
    const next = await apiRequest<Paginated<Issue>>(API_ENDPOINTS.issues.list, { token, params: { page, limit: 200 } })
    items.push(...next.items)
  }
  return [...new Map(items.map((issue) => [issue.id, issue])).values()]
}

export const fetchIssue = (token: string, id: string) => apiRequest<Issue>(API_ENDPOINTS.issues.detail(id), { token })
export const acknowledgeIssue = (token: string, id: string) => apiRequest<Issue>(API_ENDPOINTS.issues.acknowledge(id), { token, method: 'PATCH' })
export const resolveIssue = (token: string, id: string, resolutionNote: string) => apiRequest<Issue>(API_ENDPOINTS.issues.resolve(id), { token, method: 'PATCH', body: { resolutionNote } })
