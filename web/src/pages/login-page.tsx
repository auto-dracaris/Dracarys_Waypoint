import brandLockup from '@/assets/login/brand-lockup.png'
import logo from '@/assets/overview/logo.svg'
import { LoginForm } from '@/features/auth/components/login-form'
import '@/styles/login.css'

export function LoginPage({ onNotice }: { onNotice: (title: string) => void }) {
  return <div className="login-page">
    <header className="login-brand"><img src={brandLockup} alt="WayPoint" width="200" height="42" /></header>
    <main className="login-main">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-card-header">
          <img src={logo} className="login-mark" alt="" width="200" height="119" />
          <span className="login-admin-tag type-text-xs-semibold">Admin Portal</span>
          <div className="login-title-group">
            <h1 id="login-title" className="type-display-sm-medium">Sign in to manage</h1>
            <p className="type-text-sm-regular">Enter your administrator credentials below</p>
          </div>
        </div>
        <LoginForm onNotice={onNotice} />
        <footer className="login-card-footer type-text-xs-regular">Authorized access only. All activities are monitored and logged.</footer>
      </section>
    </main>
    <footer className="login-global-footer type-text-xs-regular">© 2026 Peliyagoda Hub Delivery Platform. All rights reserved.</footer>
  </div>
}
