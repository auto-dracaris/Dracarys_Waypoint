import assert from 'node:assert/strict'
import { Writable } from 'node:stream'
import { createElement } from 'react'
import { renderToPipeableStream } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const originalWindow = globalThis.window
const originalFetch = globalThis.fetch
try {
  const { default: App } = await server.ssrLoadModule('/src/app/App.tsx')
  const { UserProvider } = await server.ssrLoadModule('/src/features/auth/user-context.tsx')
  const user = (role) => ({ id: 7, firstName: 'Test', lastName: 'Account', phone: '94770000999', role, status: 'active', depotId: 4, outletId: role === 'store_manager' ? 9 : null, avatar: '/verified-avatar.png' })
  async function renderRoute(path, role) {
    const stored = JSON.stringify({ accessToken: 'synthetic-token', refreshToken: 'synthetic-refresh', user: user(role) })
    globalThis.window = { localStorage: { getItem: () => role ? stored : null }, sessionStorage: { getItem: () => null }, location: { pathname: path, search: '' } }
    return new Promise((resolve, reject) => {
      let markup = ''
      const output = new Writable({ write(chunk, encoding, next) { markup += chunk.toString(); next() } })
      output.on('finish', () => resolve(markup))
      const stream = renderToPipeableStream(createElement(MemoryRouter, { initialEntries: [path] }, createElement(UserProvider, null, createElement(App))), {
        onAllReady() { stream.pipe(output) }, onError: reject,
      })
    })
  }
  for (const [path, role] of [['/profile', 'dispatcher'], ['/store-manager/profile', 'store_manager']]) {
    const markup = await renderRoute(path, role)
    assert.match(markup, /My Profile/)
    assert.match(markup, /Test Account/)
    assert.match(markup, /src="\/verified-avatar.png"/)
    assert.match(markup, /Save changes/)
    assert.match(markup, /Change password/)
    if (role === 'dispatcher') assert.match(markup, /Knowledge contribution/)
    else assert.doesNotMatch(markup, /Knowledge contribution|Open knowledge base/)
  }
  const knowledge = await renderRoute('/knowledge', 'dispatcher')
  assert.match(knowledge, /Add a document/)
  assert.match(knowledge, /Permitted roles/)
  assert.doesNotMatch(await renderRoute('/knowledge', 'store_manager'), /Add a document/)
  assert.doesNotMatch(await renderRoute('/knowledge', null), /Add a document/)

  const auth = await server.ssrLoadModule('/src/features/auth/api.ts')
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url, ...init })
    return new Response(JSON.stringify({ data: user('dispatcher') }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  await auth.updateMe('synthetic-token', { firstName: 'New', lastName: 'Name', phone: '94770000999' })
  await auth.changePassword('synthetic-token', { currentPassword: 'synthetic-current', newPassword: 'synthetic-new' })
  assert.equal(calls[0].url, '/api/auth/me')
  assert.equal(calls[1].url, '/api/auth/change-password')
  for (const call of calls) {
    assert.equal(call.method, 'PUT')
    assert.equal(call.headers.Authorization, 'Bearer synthetic-token')
    assert.doesNotMatch(call.body, /role|depotId|outletId/)
  }
  const knowledgeApi = await server.ssrLoadModule('/src/features/knowledge/api.ts')
  await knowledgeApi.approveDocument('synthetic-token', 'document-id', 2)
  assert.equal(calls[2].url, '/ai-api/api/v1/documents/document-id/approve')
  assert.equal(new Headers(calls[2].headers).get('Authorization'), 'Bearer synthetic-token')
  assert.deepEqual(JSON.parse(calls[2].body), { version: 2 })
  console.log('Both profile routes, dispatcher-only knowledge, verified avatar data and authenticated API payloads passed (SSR/mocked API; no browser or live mutations).')
} finally {
  globalThis.window = originalWindow
  globalThis.fetch = originalFetch
  await server.close()
}
