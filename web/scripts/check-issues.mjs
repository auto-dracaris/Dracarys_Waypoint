import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('../', import.meta.url))
const server = await createServer({ root, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' })
const originalFetch = globalThis.fetch
const originalWindow = globalThis.window
try {
  const api = await server.ssrLoadModule('/src/features/issues/api.ts')
  const data = await server.ssrLoadModule('/src/features/issues/data.ts')
  const base = { id: '12345678-1234-4234-8234-123456789abc', type: 'vehicle_breakdown', title: 'Vehicle breakdown', status: 'open', description: 'Engine stopped', createdAt: '2026-10-04T02:42:00Z', recordedAt: '2026-10-04T02:42:00Z', affectedCases: null, reportedBy: { id: 1, name: 'Nimal Silva', role: 'driver' }, order: null, trip: { id: 'trip', tripNo: 1, vehicle: 'VEH021', serviceDate: '2026-10-04' }, photoUrl: null, resolvedBy: null, resolvedAt: null, resolutionNote: null }
  const progress = { ...base, id: '22345678-1234-4234-8234-123456789abc', status: 'acknowledged', title: 'Missing items', reportedBy: { id: 2, name: 'Kamal Perera', role: 'store_manager' }, order: { reference: 'ORD0000012', cases: 20, outlet: { uniqueId: 'OUT1', name: 'Colombo' } }, createdAt: '2026-10-03T23:00:00Z' }
  const resolved = { ...base, id: '32345678-1234-4234-8234-123456789abc', status: 'resolved', resolvedAt: '2026-10-03T18:31:00Z' }
  const older = { ...resolved, id: '42345678-1234-4234-8234-123456789abc', resolvedAt: '2026-10-03T18:29:00Z' }
  const issues = [base, progress, resolved, older]
  assert.deepEqual(data.issueTotals(issues, new Date('2026-10-04T02:47:00Z')), { open: 1, progress: 1, active: 2, resolved: 2, resolvedToday: 1 }, 'Resolved today must use the Colombo midnight boundary')
  assert.equal(data.receivedTime(base.createdAt, Date.parse('2026-10-04T02:47:00Z')), '08:12 · 5m ago')
  assert.equal(data.visibleIssues(issues, 'active', '', 'received', true)[0].id, base.id)
  assert.deepEqual(data.visibleIssues(issues, 'active', ' Colombo ', 'received', true).map((issue) => issue.id), [progress.id])
  assert.equal(data.visibleIssues(issues, 'progress', 'Kamal', 'reporter', false).length, 1)
  assert.equal(data.visibleIssues(issues, 'active', 'ORD0000012', 'issue', false).length, 1)
  assert.equal(data.visibleIssues(issues, 'resolved', 'VEH021', 'received', true).length, 2)
  assert.equal(data.visibleIssues(issues, 'active', 'not found', 'issue', false).length, 0)

  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    const page = new URL(url, 'http://test.local').searchParams.get('page')
    return new Response(JSON.stringify({ data: { items: page === '1' ? [base] : [progress], meta: { total: 2, page: Number(page), limit: 200, totalPages: 2 } } }), { status: 200 })
  }
  assert.equal((await api.fetchIssues('test-token')).length, 2, 'Load subsequent API pages before computing totals or searching')
  assert.equal(calls.length, 2)
  assert.match(calls[1].url, /\/issues\?page=2&limit=200$/)
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-token')
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return new Response(JSON.stringify({ data: base }), { status: 200 }) }
  await api.fetchIssue('test-token', base.id)
  assert.ok(calls.at(-1).url.endsWith(`/issues/${base.id}`))
  await api.acknowledgeIssue('test-token', base.id)
  assert.ok(calls.at(-1).url.endsWith('/acknowledge'))
  assert.equal(calls.at(-1).options.method, 'PATCH')
  await api.resolveIssue('test-token', base.id, 'Replacement vehicle sent')
  assert.ok(calls.at(-1).url.endsWith('/resolve'))
  assert.equal(calls.at(-1).options.method, 'PATCH')
  assert.deepEqual(JSON.parse(calls.at(-1).options.body), { resolutionNote: 'Replacement vehicle sent' })
  globalThis.fetch = async () => new Response(JSON.stringify({ message: 'Issue is already resolved' }), { status: 409 })
  await assert.rejects(api.resolveIssue('test-token', base.id, 'Done'), /Issue is already resolved/)
  globalThis.fetch = async () => { throw new Error('offline') }
  await assert.rejects(api.fetchIssues('test-token'), /Could not reach the server/)

  const session = JSON.stringify({ accessToken: 'test-token', user: { id: 1, firstName: 'Test', lastName: 'Dispatcher', role: 'dispatcher', depotId: 1 } })
  globalThis.window = { location: { pathname: '/issues', search: '' }, localStorage: { getItem: (key) => key === 'waypoint:session' ? session : null }, sessionStorage: { getItem: () => null } }
  const { default: App } = await server.ssrLoadModule('/src/app/App.tsx')
  const { UserProvider } = await server.ssrLoadModule('/src/features/auth/user-context.tsx')
  const markup = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/issues'] }, createElement(UserProvider, null, createElement(App))))
  assert.match(markup, /<h1[^>]*>Issues<\/h1>/)
  assert.match(markup, /aria-label="Issues" aria-current="page"/)
  assert.match(markup, /Reported issues/)
  assert.match(markup, /Loading reported issues/)
  assert.match(markup, /Search issues, deliveries or reporters/)
  const tokens = await readFile(new URL('../src/styles/tokens.css', import.meta.url), 'utf8')
  const css = await readFile(new URL('../src/styles/issues.css', import.meta.url), 'utf8')
  for (const [, token] of css.matchAll(/var\((--wp-[\w-]+)\)/g)) assert.ok(tokens.includes(`${token}:`), `Missing token ${token}`)
  console.log('Issues API pagination, authentication, detail/actions, failures, filters, sorting, Colombo dates, route/navigation and token checks passed.')
} finally {
  globalThis.fetch = originalFetch
  globalThis.window = originalWindow
  await server.close()
}
