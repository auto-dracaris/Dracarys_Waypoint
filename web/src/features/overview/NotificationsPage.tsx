import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../../shared/ui'
import { alerts } from './mockData'
import { useOverviewState } from './overviewState'
import { PendingAction } from './PendingAction'
import { OverviewPage } from './OverviewPage'

export function NotificationsPage() {
  const dialog = useRef<HTMLDialogElement>(null)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const from = params.get('from') || '/'
  const returnTo = /^\/trips\/VEH\d{3}(\?stop=[1-6])?$/.test(from) ? from : '/'
  const [filter, setFilter] = useState('All')
  const { read, markRead, notice, showNotice } = useOverviewState()
  useEffect(() => {
    const element = dialog.current
    const previousOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    element?.showModal()
    return () => { element?.close(); document.documentElement.style.overflow = previousOverflow }
  }, [])
  return <><OverviewPage />
    <dialog ref={dialog} className="notification-drawer" onCancel={event => { event.preventDefault(); navigate(returnTo) }} aria-labelledby="notification-title">
      <div className="drawer-header">
        <strong id="notification-title">Notification</strong>
        <button className="text-button" onClick={markRead}>{read ? 'All read' : 'Mark All Read'}</button>
        <Link className="button" to={returnTo} aria-label="Close notifications"><Icon name="close" /></Link>
      </div>
      <div className="segments" aria-label="Notification filters">{['All', 'Errors', 'Success', 'Info'].map(category => <button key={category} aria-pressed={category === filter} className={category === filter ? 'selected' : ''} onClick={() => setFilter(category)}>{category} <span>{category === 'All' ? alerts.length : alerts.filter(alert => alert.category === category).length}</span></button>)}</div>
      {read && <p className="read-status" role="status">All notifications marked as read.</p>}
      {notice && <div className="feature-notice" role="status"><span>{notice}</span><button aria-label="Dismiss message" onClick={() => showNotice('')}><Icon name="close" /></button></div>}
      <div className="notification-list">{alerts.filter(alert => filter === 'All' || alert.category === filter).map(alert => <article className={`notification-card ${alert.tone}`} key={alert.id}>
        <div className="notification-title"><Icon name={alert.icon} /><strong>{alert.title}</strong><small>{alert.time}</small>{!read && <span className="unread-dot" aria-label="Unread" />}</div>
        {alert.id === 'shortfall' && <small className="action-needed">Action needed</small>}
        <p>{alert.text}</p>
        {alert.id === 'shortfall' && <dl className="detail-grid"><div><dt>Order</dt><dd>DEMO-103</dd></div><div><dt>Reported by</dt><dd>Loading team</dd></div><div><dt>Run</dt><dd>Earlier run · 26 Sep 2026</dd></div><div><dt>Status</dt><dd>Awaiting review</dd></div></dl>}
        {alert.pending ? <PendingAction feature={alert.pending} className="notification-action">{alert.action} <Icon name="arrow_forward" /></PendingAction> : <Link className="notification-action" to={alert.to}>{alert.action} <Icon name="arrow_forward" /></Link>}
      </article>)}</div>
    </dialog>
  </>
}
