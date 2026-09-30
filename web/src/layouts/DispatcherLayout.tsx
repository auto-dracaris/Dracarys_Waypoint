import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import logo from '../assets/figma/8c49b.svg'
import { Icon } from '../shared/ui'
import { useOverviewState } from '../features/overview/overviewState'
import { PendingAction } from '../features/overview/PendingAction'

const navigation = [['format_list_bulleted', 'Orders'], ['more_time', 'Planning'], ['local_shipping', 'Vehicles'], ['storefront', 'Outlets'], ['people', 'Team']]
export function DispatcherLayout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const { notice, showNotice } = useOverviewState()
  const overviewActive = pathname === '/' || pathname.startsWith('/trips/') || pathname === '/notifications'
  return <div className="dispatcher-app">
    <button className="mobile-menu button" aria-label="Toggle navigation" aria-expanded={open} aria-controls="dispatcher-sidebar" onClick={() => setOpen(!open)}><Icon name="menu" /></button>
    {open && <button className="sidebar-shade" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside id="dispatcher-sidebar" className={`sidebar ${open ? 'is-open' : ''}`}>
      <div><div className="brand"><img src={logo} alt="WayPoint" /><span>PELIYAGODA HUB</span></div>
        <nav aria-label="Dispatcher navigation">
          <Link className={overviewActive ? 'active' : ''} aria-current={overviewActive ? 'page' : undefined} to="/" onClick={() => setOpen(false)}><Icon name="home" /><span>Overview</span></Link>
          {navigation.map(([icon, label], index) => <div key={label}>{index === 2 && <div className="nav-section">Management</div>}<PendingAction feature={label} className="nav-pending" onActivate={() => setOpen(false)}><Icon name={icon} /><span>{label}</span><small>Later</small></PendingAction></div>)}
        </nav>
      </div>
      <div className="profile"><div className="profile-person"><span className="avatar">DJ</span><div><strong>Dispatcher</strong><small>Demo session</small></div></div>
        <button onClick={() => { sessionStorage.removeItem('waypoint-notifications-read'); window.location.assign('/') }}><Icon name="restart_alt" />Reset demo</button>
      </div>
    </aside>
    <main className="page-shell">
      {notice && pathname !== '/notifications' && <div className="feature-notice" role="status"><span>{notice}</span><button aria-label="Dismiss message" onClick={() => showNotice('')}><Icon name="close" /></button></div>}
      <Outlet />
    </main>
  </div>
}
