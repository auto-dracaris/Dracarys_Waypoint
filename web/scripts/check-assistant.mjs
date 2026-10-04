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
  const { AssistantAnswer } = await server.ssrLoadModule('/src/features/assistant/assistant-answer.tsx')
  function answerMarkup(text) { return renderToStaticMarkup(createElement(AssistantAnswer, { text, sources })) }
  const formatted = answerMarkup('### Your orders\n\n**Confirmed:** 3 [api:orders:1]\n\n- First item\n- Second item\n\n1. Check the date\n2. Review the cutoff')
  assert.match(formatted, /<h3>Your orders<\/h3>/)
  assert.match(formatted, /<strong>Confirmed:<\/strong>/)
  assert.match(formatted, /<ul>/)
  assert.match(formatted, /<ol>/)
  assert.match(formatted, /3 \[1\]/)
  assert.match(answerMarkup('| Status | Count |\n| --- | --- |\n| Confirmed | 3 |'), /assistant-table-scroll.*<table>/s)
  assert.match(answerMarkup('[Guide](https:\/\/example.com\/guide)'), /rel="noopener noreferrer"/)
  const hostile = answerMarkup('<script>alert(1)</script>\n\n[Bad](javascript:alert%281%29)\n\n![Tracker](https://example.com/pixel)\n\n[Local](file:///private)')
  assert.doesNotMatch(hostile, /<script|<img|href="(?:javascript:|file:)/)
  assert.equal(readableCitations('Reason [order:42:deferral]', [{ id: 'order:42:deferral' }]), 'Reason [1]')
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
  const { draftDeliveryIssue } = await server.ssrLoadModule('/src/features/assistant/issue-drafts.ts')
  const { reportIssueSchema } = await server.ssrLoadModule('/src/features/store-manager/schema.ts')
  const draftFacts = { delivery_reference: 'DEMO-099', issue_type: 'Damaged goods', ordered_cases: 36, accepted_cases: 34, damaged_cases: 2, notes: '' }
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/ai-api/api/v1/issue-drafts')
    assert.equal(init.headers.Authorization, 'Bearer synthetic-token')
    assert.deepEqual(JSON.parse(init.body), draftFacts)
    return new Response(JSON.stringify({ draft: 'I accepted 34 cases and recorded 2 damaged cases.', origin: 'ai' }))
  }
  assert.equal((await draftDeliveryIssue('synthetic-token', draftFacts, new AbortController().signal)).origin, 'ai')
  globalThis.fetch = async () => new Response(JSON.stringify({ draft: 'x'.repeat(501), origin: 'ai' }))
  await assert.rejects(draftDeliveryIssue('synthetic-token', draftFacts, new AbortController().signal), /incomplete/)
  globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'private error' }), { status: 403 })
  await assert.rejects(draftDeliveryIssue('synthetic-token', draftFacts, new AbortController().signal), /account cannot draft/)
  assert.equal(reportIssueSchema.safeParse({ issueType: 'Missing goods', acceptedCases: 34, damagedCases: 0, notes: '' }).success, true)
  assert.equal(reportIssueSchema.safeParse({ issueType: 'Damaged goods', acceptedCases: 36, damagedCases: 0, notes: '' }).success, false)
  assert.equal(reportIssueSchema.safeParse({ issueType: 'Wrong items', acceptedCases: 36, damagedCases: 0, notes: '' }).success, false)
  const { draftOrderNotes } = await server.ssrLoadModule('/src/features/assistant/issue-drafts.ts')
  const orderFacts = { requested_date: '2026-10-06', temperature_requirement: 'ambient', quantity: 12, weight_kg: 24.5, volume_m3: 1.2, notes: '' }
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/ai-api/api/v1/order-drafts')
    assert.equal(init.headers.Authorization, 'Bearer synthetic-token')
    assert.deepEqual(JSON.parse(init.body), orderFacts)
    return new Response(JSON.stringify({ draft: 'Requested for 6 October: 12 ambient cases.', origin: 'ai' }))
  }
  assert.equal((await draftOrderNotes('synthetic-token', orderFacts, new AbortController().signal)).origin, 'ai')
  console.log('Assistant visibility, overlay, follow-ups, Markdown formatting, safe links, citations, errors and cancellation passed (SSR/mocked transport).')
} finally {
  globalThis.window = originalWindow
  globalThis.fetch = originalFetch
  await server.close()
}
