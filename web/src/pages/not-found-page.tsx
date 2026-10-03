import { Link, useLocation } from 'react-router-dom'

export function NotFoundPage() {
  const { pathname } = useLocation()
  const home = /^\/store-manager(?:\/|$)/.test(pathname) ? '/store-manager' : '/'
  return <main className="p-8">
    <h1 className="text-2xl font-semibold">Page not found</h1>
    <Link to={home}>Back to overview</Link>
  </main>
}
