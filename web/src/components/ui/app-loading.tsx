import logo from '@/assets/overview/logo.svg'
import '@/styles/app-loading.css'

export function AppLoading() {
  return (
    <div className="app-loading" role="status" aria-live="polite">
      <div className="app-loading-brand">
        <img className="app-loading-logo" src={logo} alt="" width="200" height="119" />
        <div className="app-loading-track" aria-hidden="true"><span /></div>
        <span className="app-loading-label">Loading WayPoint…</span>
      </div>
    </div>
  )
}
