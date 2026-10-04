import { HubBreadcrumbs } from '@/components/layout/hub-breadcrumbs'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Phone from '@mui/icons-material/Phone'
import MenuRounded from '@mui/icons-material/MenuRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/status-badge'
import { useUser } from '@/features/auth/user-context'
import { changePassword, getMe, type User } from '@/features/auth/api'
import { fetchPlacementOptions } from '@/features/store-manager/api'
import { outletLabel } from '@/features/store-manager/order-format'
import { apiRequest } from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/api-endpoints'
import cover from '@/assets/profile/cover.png'
import '@/styles/profile.css'

function PasswordDialog({ token, onClose }: { token: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  useEffect(() => { dialog.current?.showModal() }, [])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (password !== confirmation) { setMessage('The new passwords do not match.'); return }
    if (password === current) { setMessage('Choose a password different from your current password.'); return }
    setBusy(true); setMessage('')
    try {
      await changePassword(token, { currentPassword: current, newPassword: password })
      setCurrent(''); setPassword(''); setConfirmation(''); setSuccess(true)
      setMessage('Your password has been changed.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not change your password.') }
    finally { setBusy(false) }
  }
  return <dialog ref={dialog} className="profile-dialog profile-card" aria-labelledby="password-heading" onCancel={(event) => { if (busy) event.preventDefault(); else onClose() }} onClose={onClose}>
    <div className="profile-dialog-heading"><h2 id="password-heading" className="type-display-xs-medium">Change password</h2><IconButton aria-label="Close password dialog" onClick={onClose} disabled={busy}><CloseRounded /></IconButton></div>
    <form className="profile-form" onSubmit={submit}>
      {!success && <>
        <label className="profile-field type-text-sm-medium">Current password<Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required disabled={busy} /></label>
        <label className="profile-field type-text-sm-medium">New password<Input type="password" autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required disabled={busy} /><span className="type-text-xs-regular">Use at least 6 characters.</span></label>
        <label className="profile-field type-text-sm-medium">Confirm new password<Input type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required disabled={busy} /></label>
      </>}
      {message && <p role={success ? 'status' : 'alert'} className={success ? 'profile-success type-text-sm-regular' : 'profile-error type-text-sm-regular'}>{message}</p>}
      {success ? <Button onClick={onClose}>Done</Button> : <Button type="submit" variant="primary" size="md" loading={busy} loadingLabel="Changing password…">Change password</Button>}
    </form>
  </dialog>
}

export function ProfilePage({ onOpenNavigation }: { onOpenNavigation?: () => void }) {
  const { user, accessToken, updateProfile } = useUser()
  const navigate = useNavigate()
  const [loaded, setLoaded] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [assignment, setAssignment] = useState('')
  const [depot, setDepot] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [passwordOpen, setPasswordOpen] = useState(false)
  const isDispatcher = user?.role === 'dispatcher'
  useEffect(() => {
    if (!accessToken || !user) return
    let stale = false
    getMe(accessToken).then((profile) => {
      if (stale) return
      setLoaded(profile); setName(`${profile.firstName} ${profile.lastName}`.trim()); setPhone(profile.phone)
    }, (reason) => { if (!stale) setError(reason instanceof Error ? reason.message : 'Could not load your profile.') }).finally(() => { if (!stale) setLoading(false) })
    if (user.role === 'dispatcher') {
      apiRequest<User>(API_ENDPOINTS.users.detail(user.id), { token: accessToken }).then((profile) => { if (!stale) setDepot(profile.depot?.name ?? '') }).catch(() => {})
    } else {
      fetchPlacementOptions(accessToken).then(({ outlet }) => { if (!stale) { setAssignment(outletLabel(outlet)); setDepot(outlet.depot ?? '') } }).catch(() => {})
    }
    return () => { stale = true }
  }, [accessToken, user])
  if (!user || !accessToken) return null
  const account = loaded ?? user
  const displayName = `${account.firstName} ${account.lastName}`.trim()
  const depotName = depot || `Depot ${account.depotId}`
  const roleName = isDispatcher ? 'Dispatcher' : 'Store Manager'
  const subtitle = isDispatcher ? `${depotName} · Dispatch team` : `${assignment || (account.outletId ? `Outlet ${account.outletId}` : 'No outlet assigned')} · Store team`
  const dirty = name.trim() !== displayName || phone.trim() !== account.phone
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!dirty || saving || loading) return
    const parts = name.trim().split(/\s+/)
    if (parts.length < 2) { setError('Enter your first and last name.'); return }
    const firstName = name.trim() === displayName ? account.firstName : parts.shift()!
    const lastName = name.trim() === displayName ? account.lastName : parts.join(' ')
    if (firstName.length > 100 || lastName.length > 100) { setError('First and last names must each be at most 100 characters.'); return }
    // NestJS login normalizes local numbers to 94; keep the saved number compatible.
    let normalized = phone.replace(/[\s()+-]/g, '')
    if (normalized.startsWith('0')) normalized = `94${normalized.slice(1)}`
    else if (normalized.length === 9 && normalized.startsWith('7')) normalized = `94${normalized}`
    if (!/^\d{7,15}$/.test(normalized)) { setError('Enter a valid phone number.'); return }
    setSaving(true); setError(''); setSuccess('')
    try {
      const updated = await updateProfile({ firstName, lastName, phone: normalized })
      setLoaded(updated); setName(`${updated.firstName} ${updated.lastName}`.trim()); setPhone(updated.phone)
      setSuccess('Your profile has been updated.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save your profile.') }
    finally { setSaving(false) }
  }
  return <section className="profile-page" aria-labelledby="profile-title">
    <header className="profile-header"><div><h1 id="profile-title" className="type-display-lg-medium">My Profile</h1><p className="type-text-sm-regular">{subtitle}</p></div>{onOpenNavigation && <IconButton className="mobile-menu" aria-label="Open navigation" onClick={onOpenNavigation}><MenuRounded /></IconButton>}</header>
    {isDispatcher && <HubBreadcrumbs />}
    <div className="profile-overview">
      <div className="profile-cover"><img src={cover} alt="" width="1368" height="172" /></div>
      <div className="profile-identity"><div className="profile-name"><h2 className="type-display-xs-medium">{displayName}</h2><p className="type-text-md-medium">{roleName} · {depotName}</p><p className="type-text-sm-regular">{account.phone}</p></div><StatusBadge tone="success" className="profile-signed-in">● Signed in</StatusBadge></div>
      <div className="profile-avatar">{account.avatar ? <img src={account.avatar} alt={`${displayName}'s profile`} /> : <span className="type-display-md-medium">{`${account.firstName[0] ?? ''}${account.lastName[0] ?? ''}`.toUpperCase()}</span>}</div>
    </div>
    <div className="profile-settings">
      <form className="profile-card profile-form" onSubmit={save}>
        <h2 className="type-display-md-medium">Personal details</h2><p className="type-text-sm-regular">Keep your contact details up to date.</p>
        <label className="profile-field type-text-sm-medium">Display name<Input value={name} onChange={(e) => { setName(e.target.value); setSuccess('') }} required maxLength={201} autoComplete="name" disabled={loading || saving} /></label>
        <label className="profile-field type-text-sm-medium">Phone Number<span className="profile-phone"><Phone aria-hidden="true" /><Input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setSuccess('') }} required maxLength={20} autoComplete="tel" disabled={loading || saving} /></span></label>
        <dl className="profile-assignment"><div><dt className="type-text-xs-regular">Role</dt><dd className="type-text-sm-medium">{roleName}</dd></div><div><dt className="type-text-xs-regular">Assigned depot</dt><dd className="type-text-sm-medium">{depotName}</dd></div>{!isDispatcher && <div><dt className="type-text-xs-regular">Assigned outlet</dt><dd className="type-text-sm-medium">{assignment || (account.outletId ? `Outlet ${account.outletId}` : 'No outlet assigned')}</dd></div>}</dl>
        <p className="type-text-xs-regular">Role and {isDispatcher ? 'depot' : 'outlet'} permissions are managed by your administrator.</p>
        {loading && <p role="status" className="type-text-sm-regular">Loading your profile…</p>}
        {error && <p role="alert" className="profile-error type-text-sm-regular">{error}</p>}{!loaded && !loading && <Button onClick={() => window.location.reload()}>Retry loading profile</Button>}{success && <p role="status" className="profile-success type-text-sm-regular">{success}</p>}
        <Button type="submit" variant="primary" size="md" className="profile-save" disabled={!dirty || loading || !loaded} loading={saving} loadingLabel="Saving…">Save changes</Button>
      </form>
      <div className="profile-supporting"><section className="profile-card profile-form"><h2 className="type-display-md-medium">Account &amp; security</h2><p className="type-text-sm-regular">Use a strong password to protect your account.</p><Button size="md" onClick={() => setPasswordOpen(true)}>Change password</Button></section>
        {isDispatcher && <section className="profile-card profile-knowledge"><div className="profile-form"><h2 className="type-display-md-medium">Knowledge contribution</h2><StatusBadge className="profile-contributor">Contributor</StatusBadge><p className="type-text-sm-regular">Manage operating procedures, outlet guidance and handling instructions in the shared knowledge base.</p></div><Button size="md" onClick={() => navigate('/knowledge')}>Open knowledge base</Button></section>}
      </div>
    </div>
    {passwordOpen && <PasswordDialog token={accessToken} onClose={() => setPasswordOpen(false)} />}
  </section>
}
