const base = (import.meta.env.VITE_AI_API_URL ?? '/ai-api').replace(/\/$/, '')
export interface KnowledgeDocument {
  id: string
  active_version: number
  metadata: { title: string; allowed_roles: string[]; depot_ids: number[]; citation_url?: string | null }
  ingestion_status: 'queued' | 'processing' | 'ready' | 'failed' | 'revoked'
  approved: boolean
  error_code: string | null
  chunks: number | null
}
export interface KnowledgeList { items: KnowledgeDocument[]; page: number; limit: number; total: number }
async function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${token}`)
  let response: Response
  try { response = await fetch(`${base}/api/v1/documents${path}`, { ...options, headers }) }
  catch { throw new Error('Could not reach the knowledge service. Please try again.') }
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : 'The knowledge request failed. Please try again.')
  return data as T
}
export const listDocuments = (token: string, page: number) => request<KnowledgeList>(`?page=${page}&limit=10`, token)
export const approveDocument = (token: string, id: string, version: number) => request(`/${encodeURIComponent(id)}/approve`, token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version }) })
export const retryDocument = (token: string, id: string, version: number) => request(`/${encodeURIComponent(id)}/retry`, token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version }) })
export function uploadDocument(token: string, file: File, metadata: KnowledgeDocument['metadata'], key: string) {
  const body = new FormData()
  body.append('file', file); body.append('metadata', JSON.stringify(metadata))
  return request('', token, { method: 'POST', headers: { 'Idempotency-Key': key }, body })
}

export async function downloadOriginal(token: string, record: KnowledgeDocument) {
  const response = await fetch(`${base}/api/v1/documents/${encodeURIComponent(record.id)}/file?version=${record.active_version}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) throw new Error('Could not download the original document.')
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  document.body.append(link)
  const disposition = response.headers.get('Content-Disposition') ?? ''
  link.download = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1] ?? /filename="([^"]+)"/i.exec(disposition)?.[1] ?? 'document'
  try { link.download = decodeURIComponent(link.download) } catch { /* Keep the server filename. */ }
  link.click(); link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
