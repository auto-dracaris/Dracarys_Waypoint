import { Tooltip } from '@/components/ui/tooltip'
import { IconButton } from '@/components/ui/icon-button'
import LogoutRounded from '@mui/icons-material/LogoutRounded'
import ViewSidebarOutlined from '@mui/icons-material/ViewSidebarOutlined'
import { sidebarNavigation, type SidebarRole } from './sidebar-navigation'
import logo from '@/assets/overview/logo.svg'
import '@/styles/sidebar.css'

export function Sidebar({
  open,
  collapsed,
  onToggleCollapsed,
  onClose,
  onNavigate,
  activePage = 'Overview',
  role = 'Hub',
  hubLabel = 'Peliyagoda Hub',
  profile,
}: {
  open: boolean
  collapsed: boolean
  onToggleCollapsed: () => void
  onClose: () => void
  onNavigate: (page: string) => void
  activePage?: string
  role?: SidebarRole
  hubLabel?: string
  profile?: { name: string; initials: string; status: string }
}) {
  const links = sidebarNavigation[role]
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
      <aside
        id="main-navigation"
        className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${open ? 'sidebar--open' : ''}`}
        data-role={role}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose()
        }}
      >
        <div>
          <div className="brand-header">
            <div className="brand-identity">
              <img src={logo} alt="WayPoint" width="58" height="35" />
              <span className="hub-label type-text-xs-medium">
                {hubName && (
                  <>
                    <span>{hubName}</span>{' '}
                  </>
                )}
                <span>{hubType}</span>
              </span>
            </div>
            <Tooltip content={toggleLabel} placement="right" showArrow={false}>
              <IconButton size="sm" className="sidebar-toggle" aria-label={toggleLabel} aria-expanded={open || !collapsed} aria-controls="main-navigation" onClick={open ? onClose : onToggleCollapsed}>
                <ViewSidebarOutlined fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </div>
          <div className="sidebar-divider" />
          <nav aria-label="Main navigation" className="sidebar-nav">
            {links.primary.map(({ label, Icon }) => (
              <Tooltip key={label} content={label} placement="right" showArrow={false} disabled={!collapsed || open}>
                <button
                  type="button"
                  className={`nav-item type-text-sm-medium ${label === activePage ? 'nav-item--active' : ''}`}
                  aria-label={label}
                  aria-current={label === activePage ? 'page' : undefined}
                  onClick={() => navigate(label)}
                >
                  <Icon fontSize="inherit" />
                  <span className="sidebar-link-label">{label}</span>
                </button>
              </Tooltip>
            ))}
          </nav>
          {links.management.length > 0 && (
            <>
              <div className="sidebar-divider" />
              <nav aria-label="Management" className="sidebar-nav">
                <p className="management-label type-text-xs-medium">Management</p>
                {links.management.map(({ label, Icon }) => (
                  <Tooltip key={label} content={label} placement="right" showArrow={false} disabled={!collapsed || open}>
                    <button
                      type="button"
                      className={`nav-item type-text-sm-medium ${label === activePage ? 'nav-item--active' : ''}`}
                      aria-label={label}
                      aria-current={label === activePage ? 'page' : undefined}
                      onClick={() => navigate(label)}
                    >
                      <Icon fontSize="inherit" />
                      <span className="sidebar-link-label">{label}</span>
                    </button>
                  </Tooltip>
                ))}
              </nav>
            </>
          )}
        </div>
        <div className="dispatcher-card">
          <Tooltip content={`${account.name} · ${account.status}`} placement="right" showArrow={false} disabled={!collapsed || open}>
            <button type="button" className="sidebar-profile" aria-label={`${account.name} · ${account.status} · View profile`} onClick={() => navigate('Profile')}>
              <span className="dispatcher-avatar type-text-sm-bold">{account.initials}</span>
              <span className="sidebar-profile-label">
                <span className="type-text-sm-semibold">{account.name}</span>
                <span className="text-wp-neutral-300 type-text-xs-regular">{account.status}</span>
              </span>
            </button>
          </Tooltip>
          <Tooltip content="Log out" placement="right" showArrow={false} disabled={!collapsed || open}>
            <button type="button" aria-label="Log out" className="logout-button type-text-sm-regular" onClick={() => navigate('Log out')}>
              <LogoutRounded fontSize="inherit" />
              <span className="sidebar-link-label">Log out</span>
            </button>
          </Tooltip>
        </div>
      </aside>
    </>
  )
}
