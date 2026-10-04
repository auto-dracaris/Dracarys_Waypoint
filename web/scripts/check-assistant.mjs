import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const originalWindow = globalThis.window
const originalFetch = globalThis.fetch
try {
  const { FloatingChat } = await server.ssrLoadModule('/src/features/assistant/floating-chat.tsx')
  const { UserProvider } = await server.ssrLoadModule('/src/features/auth/user-context.tsx')
  function markup(role, path = '/') {
    const session = JSON.stringify({ accessToken: 'synthetic-token', user: { id: 7, firstName: 'Test', lastName: 'Account', role, depotId: 4, outletId: role === 'store_manager' ? 1 : null } })
    globalThis.window = { localStorage: { getItem: () => role ? session : null }, sessionStorage: { getItem: () => null }, setTimeout, clearTimeout }
    return renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [path] }, createElement(UserProvider, null, createElement(FloatingChat))))
  }
  for (const role of ['dispatcher', 'store_manager']) {
    const html = markup(role)
    assert.match(html, /aria-label="Open WayPoint assistant"/)
    assert.match(html, /aria-expanded="false"/)
    assert.match(html, /<dialog[^>]*id="waypoint-chat"/)
    assert.doesNotMatch(html, /<dialog[^>]*\sopen(?:[ =>])/)
    assert.match(html, /aria-labelledby="assistant-title"/)
    assert.match(html, /aria-label="Close assistant"/)
    assert.match(html, /aria-label="Send message"/)
    assert.match(html, /maxLength="2000"/i)
    assert.doesNotMatch(html, /synthetic-token/)
  }
  for (const role of [null, 'driver', 'loader']) assert.equal(markup(role), '')
  for (const path of ['/login', '/register', '/forgot-password']) assert.equal(markup('dispatcher', path), '')

  const { sendChat, readableCitations } = await server.ssrLoadModule('/src/features/assistant/api.ts')
  const id = '00000000-0000-4000-8000-000000000001'
  const sources = [{ id: 'api:orders:1', title: 'Order 1', text: 'Recorded fact' }, { id: 'policy:terms', title: 'Terms', text: 'Guidance', page: 4 }]
  const answer = { conversation_id: id, answer: 'Facts [api:orders:1, policy:terms]', status: 'answered', sources }
  const calls = []
  globalThis.fetch = async (url, init) => { calls.push({ url, ...init }); return new Response(JSON.stringify(answer), { headers: { 'Content-Type': 'application/json' } }) }
  const first = await sendChat('synthetic-token', 'Show my orders', undefined, new AbortController().signal)
  await sendChat('synthetic-token', 'What about that order?', first.conversation_id, new AbortController().signal)
  assert.equal(calls[0].url, '/ai-api/api/v1/chat')
  assert.equal(calls[0].headers.Authorization, 'Bearer synthetic-token')
  assert.deepEqual(JSON.parse(calls[0].body), { message: 'Show my orders', workflow: 'business_qa' })
  assert.deepEqual(JSON.parse(calls[1].body), { message: 'What about that order?', workflow: 'business_qa', conversation_id: id })
  assert.doesNotMatch(calls[1].body, /synthetic-token|role|depotId|outletId/)
  assert.equal(readableCitations(answer.answer, sources), 'Facts [1, 2]')
  assert.equal(readableCitations('Unknown [policy:invented]', sources), 'Unknown [policy:invented]')
  for (const [status, expected] of [[401, /Sign in again/], [403, /permission/], [504, /too long/], [503, /unavailable/]]) {
    globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'private upstream payload' }), { status })
    await assert.rejects(sendChat('synthetic-token', 'Question', id, new AbortController().signal), (error) => expected.test(error.message) && !error.message.includes('private'))
  }
  globalThis.fetch = async () => new Response(JSON.stringify({ answer: 'Incomplete' }))
  await assert.rejects(sendChat('synthetic-token', 'Question', undefined, new AbortController().signal), /incomplete response/)
  globalThis.fetch = async (url, { signal }) => new Promise((resolve, reject) => {
    if (signal.aborted) reject(new DOMException('Aborted', 'AbortError'))
    else signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
  })
  const controller = new AbortController()
  const pending = sendChat('synthetic-token', 'Question', id, controller.signal)
  controller.abort()
  await assert.rejects(pending, /Request cancelled/)
  console.log('Assistant visibility, closed native overlay, authenticated follow-ups, citations, error handling and cancellation passed (SSR/mocked transport).')
} finally {
  globalThis.window = originalWindow
  globalThis.fetch = originalFetch
  await server.close()
}
