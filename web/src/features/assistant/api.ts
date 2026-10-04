export interface ChatSource {
  id: string
  title: string
  text: string
  page?: number | null
  version?: number | null
}
export interface ChatAnswer {
  conversation_id: string
  answer: string
  status: string
  sources: ChatSource[]
}

const base = (import.meta.env.VITE_AI_API_URL ?? '/ai-api').replace(/\/$/, '')

export async function sendChat(token: string, message: string, conversationId: string | undefined, signal: AbortSignal): Promise<ChatAnswer> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (signal.aborted) controller.abort()
  else signal.addEventListener('abort', abort, { once: true })
  const timeout = window.setTimeout(() => controller.abort(), 40_000)
  try {
    const response = await fetch(`${base}/api/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message, workflow: 'business_qa', ...(conversationId && { conversation_id: conversationId }) }),
      signal: controller.signal,
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      if (response.status === 401) throw new Error('Your session could not be verified. Sign in again to continue chatting.')
      if (response.status === 403) throw new Error('Your account does not have permission to access that information.')
      if (response.status === 504) throw new Error('The assistant took too long to respond. Please try again.')
      if (response.status === 409) throw new Error('This conversation is busy. Please try again shortly.')
      throw new Error('The assistant is unavailable right now. Please try again.')
    }
    if (typeof result?.answer !== 'string' || typeof result?.conversation_id !== 'string' || !Array.isArray(result?.sources) || !result.sources.every((source: ChatSource) => source && typeof source.id === 'string' && typeof source.title === 'string' && typeof source.text === 'string')) {
      throw new Error('The assistant returned an incomplete response. Please try again.')
    }
    return result as ChatAnswer
  } catch (error) {
    if (signal.aborted) throw new Error('Request cancelled. You can send your message again.', { cause: error })
    if (controller.signal.aborted) throw new Error('The assistant took too long to respond. Please try again.', { cause: error })
    if (error instanceof TypeError) throw new Error('Could not reach the assistant. Check your connection and try again.', { cause: error })
    throw error
  } finally {
    window.clearTimeout(timeout)
    signal.removeEventListener('abort', abort)
  }
}

export function readableCitations(answer: string, sources: ChatSource[]): string {
  return answer.replace(/\[((?:api:|policy:|identity:|runtime:)[^\]]+)\]/g, (original, group: string) => {
    const indices = group.split(',').map((id) => sources.findIndex((source) => source.id === id.trim()) + 1)
    return indices.every((index) => index > 0) ? `[${indices.join(', ')}]` : original
  })
}
