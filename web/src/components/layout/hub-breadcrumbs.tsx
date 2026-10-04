import { Link, useLocation } from 'react-router-dom'
import '@/styles/hub-breadcrumbs.css'

type Crumb = { label: string; to?: string }

const home: Crumb = { label: 'Home', to: '/' }
const management: Crumb[] = [home, { label: 'Dashboard', to: '/' }, { label: 'Management' }]
const trails: Record<string, Crumb[]> = {
  '/': [home, { label: 'Overview' }],
  '/vehicles': [...management, { label: 'Vehicles' }],
  '/outlets': [...management, { label: 'Outlets' }],
  '/team': [...management, { label: 'Team' }],
  '/orders': [home, { label: 'Orders' }],
  '/issues': [home, { label: 'Issues' }],
  '/profile': [home, { label: 'My Profile' }],
  '/knowledge': [home, { label: 'My Profile', to: '/profile' }, { label: 'Knowledge base' }],
  '/planning': [home, { label: 'Planning' }, { label: 'Active Plan' }, { label: 'Final Plan Review' }],
  '/planning/published': [home, { label: 'Planning', to: '/planning' }, { label: 'Final Review', to: '/planning' }, { label: 'Plan Published' }],
  '/operations': [home, { label: 'Operations' }, { label: 'Operational Plan', to: '/planning' }, { label: 'Loading Exception' }],
  '/operations/loading-exception': [home, { label: 'Operations', to: '/operations' }, { label: 'Operational Plan', to: '/planning' }, { label: 'Loading Exception' }],
}

export function HubBreadcrumbs({ className = '' }: { className?: string }) {
  const { pathname } = useLocation()
  const items = trails[pathname.replace(/\/$/, '') || '/']
  if (!items) return null
  return <nav aria-label="Breadcrumb" className={`hub-breadcrumbs type-text-sm-medium ${className}`}>
    <ol>{items.map(({ label, to }, index) => <li key={`${index}-${label}`}>
      {index > 0 && <span aria-hidden="true">/</span>}
      {index === items.length - 1
        ? <strong aria-current="page" className="text-wp-text-primary type-text-sm-semibold">{label}</strong>
        : to ? <Link to={to}>{label}</Link> : <span>{label}</span>}
    </li>)}</ol>
  </nav>
}
