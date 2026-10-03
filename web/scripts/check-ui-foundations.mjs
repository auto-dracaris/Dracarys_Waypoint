import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup, renderToPipeableStream } from 'react-dom/server'
import { Writable } from 'node:stream'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('../', import.meta.url))
const server = await createServer({ root, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' })
const render = (Component, props) => renderToStaticMarkup(createElement(Component, props))
const noop = () => {}
const originalWindow = globalThis.window

try {
  const { Button } = await server.ssrLoadModule('/src/components/ui/button.tsx')
  const { IconButton } = await server.ssrLoadModule('/src/components/ui/icon-button.tsx')
  const { Input } = await server.ssrLoadModule('/src/components/ui/input.tsx')
  const { Select } = await server.ssrLoadModule('/src/components/ui/select.tsx')
  const { Textarea } = await server.ssrLoadModule('/src/components/ui/textarea.tsx')
  const { StatusBadge } = await server.ssrLoadModule('/src/components/ui/status-badge.tsx')
  const { Tooltip } = await server.ssrLoadModule('/src/components/ui/tooltip.tsx')

  const ref = { current: null }
  const click = () => 'clicked'
  const change = () => 'changed'
  for (const Component of [Button, IconButton]) {
    const element = Component({ ref, onClick: click, 'aria-label': 'Save', children: 'Save' })
    assert.equal(element.props.ref, ref)
    assert.equal(element.props.onClick, click)
    assert.equal(element.props.type, 'button', 'Shared buttons must not submit forms by default')
  }
  for (const Component of [Input, Select, Textarea]) {
    const element = Component({ ref, name: 'notes', onChange: change, value: 'kept', required: true, 'aria-describedby': 'notes-help' })
    assert.equal(element.props.ref, ref)
    assert.equal(element.props.onChange, change)
    assert.equal(element.props.value, 'kept')
    assert.equal(element.props.required, true)
    assert.equal(element.props['aria-describedby'], 'notes-help')
    assert.match(render(Component, { invalid: true, disabled: true, name: 'notes' }), /aria-invalid="true"/)
    assert.match(render(Component, { invalid: true, disabled: true, name: 'notes' }), /disabled=""/)
  }
  assert.match(render(Button, { type: 'submit', children: 'Save' }), /type="submit"/)
  const loading = render(Button, { loading: true, loadingLabel: 'Saving changes', children: 'Save' })
  assert.match(loading, /disabled=""/)
  assert.match(loading, /aria-busy="true"/)
  assert.match(loading, /Saving changes/)
  assert.doesNotMatch(render(Button, { disabled: true, children: 'Save' }), /aria-busy="true"/)
  assert.match(render(Input, { type: 'email', required: true, autoComplete: 'username' }), /type="email"/)
  assert.match(render(Select, { defaultValue: 'available', children: createElement('option', { value: 'available' }, 'Available') }), /value="available" selected=""/)
  assert.match(render(Textarea, { defaultValue: 'Store notes', rows: 4 }), /rows="4"[^>]*>Store notes<\/textarea>/)
  const badge = render(StatusBadge, { tone: 'warning', children: 'Deferred' })
  assert.match(badge, /Deferred/)
  assert.doesNotMatch(badge, /role="(?:alert|status)"/, 'Static badges must not create live announcements')
  const trigger = createElement('button', { ref, onClick: click, 'aria-label': 'Refresh', 'aria-describedby': 'existing-help' }, 'Refresh')
  const tooltip = render(Tooltip, { content: 'Additional explanation', children: trigger })
  assert.match(tooltip, /aria-describedby="existing-help"/)
  assert.doesNotMatch(tooltip, /Additional explanation/, 'Closed tooltip content must not enter the trigger accessible name')
  console.log('Shared control props, refs, loading guards and semantic output passed.')

  const { default: App } = await server.ssrLoadModule('/src/app/App.tsx')
  const renderRoute = (url) => new Promise((resolve, reject) => {
    const { pathname, search } = new URL(url, 'http://waypoint.test')
    globalThis.window = { location: { pathname, search }, localStorage: { getItem: () => null } }
    const element = createElement(MemoryRouter, { initialEntries: [url] }, createElement(App))
    // Hub's existing map intentionally renders its Suspense fallback during SSR.
    if (!url.startsWith('/store-manager')) { resolve(renderToStaticMarkup(element)); return }
    let markup = ''
    const output = new Writable({ write(chunk, encoding, next) { markup += chunk.toString(); next() } })
    output.on('finish', () => resolve(markup))
    const stream = renderToPipeableStream(element, {
      onAllReady() { stream.pipe(output) }, onError: reject,
    })
  })
  const routes = [
    ['/', 'Delivery Overview'], ['/login', 'Sign in to manage'], ['/vehicles', 'Vehicles'],
    ['/outlets', 'Outlets'], ['/team', 'Team'], ['/orders', 'Confirmed Orders'],
    ['/planning', 'Final Plan Review'], ['/planning/published', 'Plan Published'],
    ['/operations/loading-exception', 'Loading Exception Review'],
  ]
  for (const [pathname, title] of routes) {
    const markup = await renderRoute(pathname)
    assert.match(markup, new RegExp(`<h1[^>]*>${title}</h1>`))
    if (pathname === '/login') {
      assert.match(markup, /id="login-email"[^>]*type="email"[^>]*required=""/)
      assert.match(markup, /id="login-password"[^>]*type="password"[^>]*required=""/)
    } else assert.match(markup, /aria-label="Open navigation"/)
    if (pathname === '/orders') assert.match(markup, /orders-workspace\s/, 'Orders must retain full-width planning without a selected order')
  }
  assert.match(await renderRoute('/orders?order=DEMO-108'), /orders-workspace--review-open/, 'URL order selection must still open allocation review')
  const { Sidebar } = await server.ssrLoadModule('/src/components/layout/sidebar.tsx')
  for (const role of ['Hub', 'Store Manager']) {
    for (const collapsed of [false, true]) {
      const markup = render(Sidebar, { role, collapsed, open: false, onToggleCollapsed: noop, onClose: noop, onNavigate: noop })
      assert.match(markup, /alt="WayPoint"/)
      assert.match(markup, /aria-label="Log out"/)
      assert.match(markup, new RegExp(`aria-label="${collapsed ? 'Expand' : 'Collapse'} navigation"`))
      assert.doesNotMatch(markup, /role="tooltip"/, 'Sidebar tooltips must initially stay closed')
    }
  }
  console.log('Nine routes, order selection and four sidebar variants rendered successfully.')

  for (const [url, content] of [
    ['/store-manager', /Loading dashboard data/],
    ['/store-manager/orders', /<h1[^>]*>Orders</],
    ['/store-manager/orders/create', /Place an order/],
    ['/store-manager/deliveries', /<h1[^>]*>Deliveries</],
    ['/store-manager/delivery/VEH012', /Ambient Delivery/],
    ['/store-manager/login', /type="password"/],
    ['/store-manager/unknown', /Page not found/],
    ['/unknown', /Page not found/],
  ]) {
    const markup = await renderRoute(url)
    assert.match(markup, content, url)
    assert.doesNotMatch(markup, /overview-shell/, 'Store Manager must not render inside the Hub shell')
  }
  const { TodayDeliveries } = await server.ssrLoadModule('/src/features/store-manager/components/my-deliveries/today-deliveries.tsx')
  const { mockApiData } = await server.ssrLoadModule('/src/features/store-manager/data/dashboard-overview.ts')
  const deliveries = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(TodayDeliveries, { deliveries: mockApiData.todayDeliveries })))
  assert.match(deliveries, /href="\/store-manager\/delivery\/VEH012"/)
  assert.doesNotMatch(deliveries, /src="\/store-manager\//, 'Artwork must use bundled asset imports')
  console.log('Six Store Manager routes, delivery links and both not-found routes rendered successfully.')

  const { OrdersTable } = await server.ssrLoadModule('/src/features/orders/components/orders-table.tsx')
  const { initialOrders } = await server.ssrLoadModule('/src/features/orders/data.ts')
  for (const [status, tone] of [['Allocated', 'success'], ['Unallocated', 'error'], ['Deferred', 'warning']]) {
    const markup = render(OrdersTable, { orders: [{ ...initialOrders[0], status }], checked: new Set(), sort: { key: null, direction: 'ascending' }, onSort: noop, onCheck: noop, onSelect: noop, onClear: noop, onAddColumn: noop })
    assert.match(markup, new RegExp(`wp-status-badge--${tone}[^>]*>${status}</span>`))
  }
  console.log('Feature-owned allocation status mappings passed.')

  const uiPath = new URL('../src/components/ui/', import.meta.url)
  const variables = new Set((await readFile(new URL('../src/styles/tokens.css', import.meta.url), 'utf8')).match(/--wp-[\w-]+(?=:)/g))
  for (const entry of await readdir(uiPath)) {
    if (!/\.(tsx|css)$/.test(entry)) continue
    const source = await readFile(new URL(entry, uiPath), 'utf8')
    assert.doesNotMatch(source, /(?:from|import)\s*['"][^'"]*(?:features|pages)\//, `${entry} must not depend on a feature or page`)
    if (entry.endsWith('.css')) {
      for (const [, variable] of source.matchAll(/var\((--wp-[\w-]+)/g)) assert.ok(variables.has(variable), `${entry}: unknown token ${variable}`)
      assert.doesNotMatch(source, /#[\da-f]{3,8}\b|(?:background|color|padding|gap|border-radius|font-size):\s*\d+px/i, `${entry} must use visual tokens`)
    }
  }
  for (const filename of ['overview.css', 'vehicles.css']) {
    const source = await readFile(new URL(`../src/styles/${filename}`, import.meta.url), 'utf8')
    assert.doesNotMatch(source, /^\.(?:wp-button|icon-button)(?:\s|:|--)/m, `${filename} must not own shared button foundations`)
  }
  console.log('Shared dependency boundaries, token references and button style ownership passed.')
} finally {
  if (originalWindow === undefined) delete globalThis.window
  else globalThis.window = originalWindow
  await server.close()
}
