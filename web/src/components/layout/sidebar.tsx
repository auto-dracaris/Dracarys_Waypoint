import { useState } from 'react'
import LogoutRounded from '@mui/icons-material/LogoutRounded'
import ViewSidebarOutlined from '@mui/icons-material/ViewSidebarOutlined'
import ArrowLeftRounded from '@mui/icons-material/ArrowLeftRounded'
import ArrowRightRounded from '@mui/icons-material/ArrowRightRounded'
import { sidebarNavigation, type SidebarRole } from './sidebar-navigation'
import logo from '@/assets/overview/logo.svg'
import '@/styles/sidebar.css'

export function Sidebar({ open, collapsed, onToggleCollapsed, onClose, onNavigate, activePage = 'Overview', role = 'Hub', hubLabel = 'Peliyagoda Hub', profile }: {
  open: boolean; collapsed: boolean; onToggleCollapsed: () => void; onClose: () => void;
  onNavigate: (page: string) => void; activePage?: string; role?: SidebarRole; hubLabel?: string;
  profile?: { name: string; initials: string; status: string };
}) {
  const links = sidebarNavigation[role]
  const [tooltipsDismissed, setTooltipsDismissed] = useState(false)
  const account = profile ?? { name: role === 'Hub' ? 'Dispatcher' : 'Store Manager', initials: role === 'Hub' ? 'DJ' : 'SM', status: 'Signed in' }
  const toggleLabel = open ? 'Close navigation' : collapsed ? 'Expand navigation' : 'Collapse navigation'
  const hubWords = hubLabel.trim().split(/\s+/)
  const hubName = hubWords.slice(0, -1).join(' ')
  const hubType = hubWords.at(-1)
  function navigate(label: string) {
    onClose()
    onNavigate(label)
  }
  return (
    <>
      {open && <button type="button" className="sidebar-backdrop" aria-label="Close navigation" onClick={onClose} />}
      <aside id="main-navigation" className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${open ? 'sidebar--open' : ''} ${tooltipsDismissed ? 'sidebar--tooltips-dismissed' : ''}`} data-role={role}
        onPointerOver={() => setTooltipsDismissed(false)} onFocusCapture={() => setTooltipsDismissed(false)}
        onKeyDown={event => { if (event.key === 'Escape') { setTooltipsDismissed(true); onClose() } }}>
        <div>
          <div className="brand-header">
            <div className="brand-identity"><img src={logo} alt="WayPoint" width="58" height="35" />
              <span className="hub-label type-text-xs-medium">{hubName && <><span>{hubName}</span>{' '}</>}<span>{hubType}</span></span>
            </div>
            <button type="button" className="sidebar-toggle" aria-label={toggleLabel} aria-expanded={open || !collapsed} aria-controls="main-navigation" onClick={open ? onClose : onToggleCollapsed}>
              <span className="sidebar-panel-icon" aria-hidden="true"><ViewSidebarOutlined fontSize="inherit" />{open || !collapsed ? <ArrowLeftRounded className="sidebar-panel-arrow" fontSize="inherit" /> : <ArrowRightRounded className="sidebar-panel-arrow" fontSize="inherit" />}</span>
              <span aria-hidden="true" className="sidebar-link-tooltip type-text-sm-medium">{toggleLabel}</span>
            </button>
          </div>
          <div className="sidebar-divider" />
          <nav aria-label="Main navigation" className="sidebar-nav">
            {links.primary.map(({ label, Icon }) => <button type="button" key={label} className={`nav-item type-text-sm-medium ${label === activePage ? 'nav-item--active' : ''}`} aria-label={label} aria-current={label === activePage ? 'page' : undefined} onClick={() => navigate(label)}><Icon fontSize="inherit" /><span className="sidebar-link-label">{label}</span><span aria-hidden="true" className="sidebar-link-tooltip">{label}</span></button>)}
          </nav>
          {links.management.length > 0 && <><div className="sidebar-divider" />
            <nav aria-label="Management" className="sidebar-nav"><p className="management-label type-text-xs-medium">Management</p>
              {links.management.map(({ label, Icon }) => <button type="button" key={label} className={`nav-item type-text-sm-medium ${label === activePage ? 'nav-item--active' : ''}`} aria-label={label} aria-current={label === activePage ? 'page' : undefined} onClick={() => navigate(label)}><Icon fontSize="inherit" /><span className="sidebar-link-label">{label}</span><span aria-hidden="true" className="sidebar-link-tooltip">{label}</span></button>)}
            </nav></>}
        </div>
        <div className="dispatcher-card">
          <button type="button" className="sidebar-profile" aria-label={`${account.name} · ${account.status} · View profile`} onClick={() => navigate('Profile')}>
            <span className="dispatcher-avatar type-text-sm-bold">{account.initials}</span>
            <span className="sidebar-profile-label"><span className="type-text-sm-semibold">{account.name}</span><span className="text-wp-neutral-300 type-text-xs-regular">{account.status}</span></span>
            <span aria-hidden="true" className="sidebar-link-tooltip type-text-sm-medium">{account.name} · {account.status}</span>
          </button>
          <button type="button" aria-label="Log out" className="logout-button type-text-sm-regular" onClick={() => navigate('Log out')}><LogoutRounded fontSize="inherit" /><span className="sidebar-link-label">Log out</span><span aria-hidden="true" className="sidebar-link-tooltip">Log out</span></button>
        </div>
      </aside>
    </>
  )
}
