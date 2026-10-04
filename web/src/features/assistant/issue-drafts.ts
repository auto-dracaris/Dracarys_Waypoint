export interface IssueDraftFacts {
  delivery_reference: string
  issue_type: 'Damaged goods' | 'Missing goods' | 'Wrong items'
  ordered_cases: number
  accepted_cases: number
  damaged_cases: number
  notes: string
}

const base = (import.meta.env.VITE_AI_API_URL ?? '/ai-api').replace(/\/$/, '')

export interface OrderDraftFacts {
  requested_date: string
  temperature_requirement: 'ambient' | 'chilled'
  quantity: number
  weight_kg: number
  volume_m3: number
  notes: string
}

export function draftDeliveryIssue(token: string, facts: IssueDraftFacts, signal: AbortSignal) {
  return requestDraft('issue-drafts', token, facts, signal)
}

export function draftOrderNotes(token: string, facts: OrderDraftFacts, signal: AbortSignal) {
  return requestDraft('order-drafts', token, facts, signal)
}

async function requestDraft(path: 'issue-drafts' | 'order-drafts', token: string, facts: IssueDraftFacts | OrderDraftFacts, signal: AbortSignal): Promise<{ draft: string; origin: 'ai' | 'form' }> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (signal.aborted) controller.abort()
  else signal.addEventListener('abort', abort, { once: true })
  const timeout = window.setTimeout(() => controller.abort(), 40_000)
  try {
    const response = await fetch(`${base}/api/v1/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(facts), signal: controller.signal,
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      if (response.status === 401) throw new Error('Sign in again to draft your message.')
      if (response.status === 403) throw new Error('Your account cannot draft a delivery note.')
      if (response.status === 422) throw new Error('Check the form details and remove any credentials from your notes.')
      throw new Error('Drafting is unavailable right now. You can still write your note manually.')
    }
    if (typeof result?.draft !== 'string' || !result.draft.trim() || result.draft.length > 500 || !['ai', 'form'].includes(result.origin)) throw new Error('The draft was incomplete. Please try again.')
    return result
  } catch (error) {
    if (signal.aborted) throw new Error('Draft cancelled.', { cause: error })
    if (controller.signal.aborted) throw new Error('Drafting took too long. Try again or write your note manually.', { cause: error })
    if (error instanceof TypeError) throw new Error('Could not reach the assistant. Your notes are still available.', { cause: error })
    throw error
  } finally {
    window.clearTimeout(timeout)
    signal.removeEventListener('abort', abort)
  }
}
