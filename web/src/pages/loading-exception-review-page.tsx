import { StatusBadge } from '@/components/ui/status-badge'
import { IconButton } from '@/components/ui/icon-button'
import { useState } from 'react'
import MenuRounded from '@mui/icons-material/MenuRounded'
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded'
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded'
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined'
import { Button } from '@/components/ui/button'
import { LoadingDiscrepancy } from '@/features/operations/components/loading-discrepancy'
import { LoadingActionOptions } from '@/features/operations/components/loading-action-options'
import { loadingConsequences, loadingActions, type LoadingAction, type LoadingException } from '@/features/operations/data'
import '@/styles/vehicles.css'
import '@/styles/planning.css'
import '@/styles/loading-exception.css'

export function LoadingExceptionReviewPage({ exception, onConfirm, onNavigate, onOpenNavigation, navigationOpen }: {
  exception: LoadingException; onConfirm: (action: LoadingAction, notes: string) => string | null; onNavigate: (page: string) => void; onOpenNavigation: () => void; navigationOpen: boolean;
}) {
  const [action, setAction] = useState<LoadingAction>(exception.decision?.action ?? 'partial')
  const [notes, setNotes] = useState(exception.decision?.notes ?? exception.initialNotes)
  const [error, setError] = useState('')
  const decision = exception.decision
  const approved = decision?.departure === 'Approved'
  const dateLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${exception.date}T12:00:00`))
  const bannerTitle = !decision ? 'Departure on hold — dispatcher decision needed' : approved ? 'Partial delivery approved' : decision.action === 'correct' ? 'Load correction requested — departure remains on hold' : 'Replanning requested — departure remains on hold'
  const actionTitle = loadingActions.find(option => option.id === (decision?.action ?? action))!.title
  return <div className="overview-canvas loading-canvas">
    <header className="overview-header plan-page-header"><div className="plan-page-title"><div className="flex items-center gap-wp-space-lg"><IconButton type="button" className="mobile-menu" aria-label="Open navigation" aria-expanded={navigationOpen} aria-controls="main-navigation" onClick={onOpenNavigation}><MenuRounded fontSize="inherit" /></IconButton><h1 className="type-display-lg-medium">Loading Exception Review</h1></div><p className="type-text-sm-regular text-wp-text-secondary">{exception.depot} • {dateLabel}</p></div><StatusBadge tone={approved ? 'success' : 'error'}>{approved ? 'Departure approved' : 'Departure on hold'}</StatusBadge></header>
    <nav aria-label="Breadcrumb" className="fleet-breadcrumb type-text-sm-medium"><span><button onClick={() => onNavigate('Home')}>Home</button><span aria-hidden="true">/</span></span><span>Operations<span aria-hidden="true">/</span></span><span>Operational Plan<span aria-hidden="true">/</span></span><strong aria-current="page" className="text-wp-text-primary type-text-sm-semibold">Loading Exception</strong></nav>
    <section className={`loading-alert ${approved ? 'loading-alert--approved' : ''}`} aria-labelledby="loading-alert-title"><span className="loading-alert-icon">{approved ? <CheckCircleOutlineRounded fontSize="inherit" /> : <WarningAmberRounded fontSize="inherit" />}</span><div><h2 id="loading-alert-title" className="type-text-md-bold">{bannerTitle}</h2><p className="type-text-sm-regular">{exception.vehicleId} {exception.trip} • Planned departure {exception.departure} • Chilled dairy SKU shortage and packaging damage reported.</p></div></section>
    {decision && <p role="status" className="fleet-update-message type-text-sm-medium">{actionTitle} recorded for this preview only. No live departure, plan change, or notification was sent.</p>}
    <form className="loading-workspace" onSubmit={event => { event.preventDefault(); const result = onConfirm(action, notes); setError(result ?? '') }}><div className="loading-main"><LoadingDiscrepancy exception={exception} /><LoadingActionOptions exception={exception} action={action} notes={notes} error={error} onAction={value => { setAction(value); setError('') }} onNotes={value => { setNotes(value); setError('') }} /></div><aside className="loading-sidebar" aria-label="Loading decision consequences"><section className={`plan-review-card loading-consequence ${action === 'partial' ? 'loading-consequence--partial' : 'loading-consequence--hold'}`} aria-labelledby="loading-consequence-title"><h2 id="loading-consequence-title" className="type-text-sm-bold"><VisibilityOutlined fontSize="inherit" />Consequence Preview</h2><p className="type-text-xs-regular">{decision ? 'Decision recorded. Intended follow-up:' : 'Proposed changes if approved:'}</p><ul className="loading-consequence-list">{loadingConsequences(exception, action).map(item => <li key={item} className="type-text-xs-medium">{item}</li>)}</ul></section><div className="loading-confirm"><Button type="submit" variant="primary" disabled={!!decision || (action === 'partial' && !notes.trim())}>{decision ? 'Decision recorded' : 'Confirm decision'}</Button>{error && <p id="loading-decision-error" role="alert" className="loading-decision-error type-text-xs-medium">{error}</p>}<p className="type-text-xs-regular text-wp-text-tertiary">{decision ? `Logged locally to audit ${exception.version} · ${new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(decision.recordedAt))}` : `Decision will be logged to WayPoint audit ${exception.version}`}</p></div></aside></form>
  </div>
}
