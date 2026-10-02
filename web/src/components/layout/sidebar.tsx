import HomeOutlined from '@mui/icons-material/HomeOutlined'
import FormatListBulletedRounded from '@mui/icons-material/FormatListBulletedRounded'
import MoreTimeRounded from '@mui/icons-material/MoreTimeRounded'
import BrushOutlined from '@mui/icons-material/BrushOutlined'
import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined'
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined'
import PeopleOutlineRounded from '@mui/icons-material/PeopleOutlineRounded'
import LogoutRounded from '@mui/icons-material/LogoutRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import logo from '@/assets/overview/logo.svg'

const primaryLinks = [
  { label: 'Overview', Icon: HomeOutlined },
  { label: 'Orders', Icon: FormatListBulletedRounded },
  { label: 'Planning', Icon: MoreTimeRounded },
  { label: 'Operations', Icon: BrushOutlined },
]
const managementLinks = [
  { label: 'Vehicles', Icon: LocalShippingOutlined },
  { label: 'Outlets', Icon: StorefrontOutlined },
  { label: 'Team', Icon: PeopleOutlineRounded },
]

export function Sidebar({ open, onClose, onNavigate, activePage = 'Overview' }: { open: boolean; onClose: () => void; onNavigate: (page: string) => void; activePage?: string }) {
  function navigate(label: string) {
    onClose()
    onNavigate(label)
  }
  return (
    <>
      {open && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={onClose} />}
      <aside id="main-navigation" className={`sidebar ${open ? 'sidebar--open' : ''}`} onKeyDown={(event) => { if (event.key === 'Escape') onClose() }}>
        <div>
          <div className="brand-header">
            <img src={logo} alt="WayPoint" width="58" height="35" />
            <span className="hub-badge type-text-xs-medium">PELIYAGODA HUB</span>
            <button className="icon-button sidebar-close" onClick={onClose} aria-label="Close navigation"><CloseRounded fontSize="inherit" /></button>
          </div>
          <div className="sidebar-divider" />
          <nav aria-label="Main navigation" className="sidebar-nav">
            {primaryLinks.map(({ label, Icon }) => <button key={label} className={`nav-item type-text-sm-medium ${label === activePage ? 'nav-item--active' : ''}`} aria-current={label === activePage ? 'page' : undefined} onClick={() => navigate(label)}><Icon fontSize="inherit" /><span>{label}</span></button>)}
          </nav>
          <div className="sidebar-divider" />
          <nav aria-label="Management" className="sidebar-nav">
            <p className="management-label type-text-xs-medium">Management</p>
            {managementLinks.map(({ label, Icon }) => <button key={label} className={`nav-item type-text-sm-medium ${label === activePage ? 'nav-item--active' : ''}`} aria-current={label === activePage ? 'page' : undefined} onClick={() => navigate(label)}><Icon fontSize="inherit" /><span>{label}</span></button>)}
          </nav>
        </div>
        <div className="dispatcher-card">
          <div className="flex items-center gap-wp-space-lg">
            <span className="dispatcher-avatar type-text-sm-bold">DJ</span>
            <div><p className="type-text-sm-semibold">Dispatcher</p><p className="text-wp-neutral-300 type-text-xs-regular">Signed in</p></div>
          </div>
          <button className="logout-button type-text-sm-regular" onClick={() => navigate('Log out')}><LogoutRounded fontSize="inherit" />Log out</button>
        </div>
      </aside>
    </>
  )
}
