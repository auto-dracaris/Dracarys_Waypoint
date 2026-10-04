import { useEffect, useRef, useState } from 'react'
import RefreshRounded from '@mui/icons-material/RefreshRounded'
import LocalShippingRounded from '@mui/icons-material/LocalShippingRounded'
import CancelRounded from '@mui/icons-material/CancelRounded'
import BuildRounded from '@mui/icons-material/BuildRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import MenuRounded from '@mui/icons-material/MenuRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import SwapVertRounded from '@mui/icons-material/SwapVertRounded'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { useUser } from '@/features/auth/user-context'
import { fetchIssues, type Issue } from '@/features/issues/api'
import { issueReference, issueStatus, issueSubject, issueTotals, receivedTime, reporterRole, visibleIssues, type IssueFilter, type IssueSortKey } from '@/features/issues/data'
import { IssueReview } from '@/features/issues/issue-review'
import '@/styles/issues.css'

export function IssuesPage({ onOpenNavigation, navigationOpen }: { onOpenNavigation: () => void; navigationOpen: boolean }) {
  const { user, accessToken } = useUser()
  const [issues, setIssues] = useState<Issue[] | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const [filter, setFilter] = useState<IssueFilter>('active')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: IssueSortKey; descending: boolean }>({ key: 'received', descending: true })
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const search = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!accessToken) return
    let stale = false
    fetchIssues(accessToken).then((data) => {
      if (!stale) { setIssues(data); setError(''); setLoading(false) }
    }, (reason: Error) => { if (!stale) { setError(reason.message); setLoading(false) } })
    return () => { stale = true }
  }, [accessToken, attempt])
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !document.querySelector('dialog[open]')) { event.preventDefault(); search.current?.focus() }
    }
    window.addEventListener('keydown', shortcut)
    const timer = window.setInterval(() => setNow(Date.now()), 60000)
    return () => { window.removeEventListener('keydown', shortcut); window.clearInterval(timer) }
  }, [])
  const totals = issues ? issueTotals(issues, new Date(now)) : null
  const filtered = visibleIssues(issues ?? [], filter, query, sort.key, sort.descending)
  const pages = Math.max(1, Math.ceil(filtered.length / 10))
  const currentPage = Math.min(page, pages)
  const rows = filtered.slice((currentPage - 1) * 10, currentPage * 10)
  const tabs = [{ key: 'active', label: 'All active', count: totals?.active }, { key: 'progress', label: 'In progress', count: totals?.progress }, { key: 'resolved', label: 'Resolved', count: totals?.resolved }] as const
  const stats = [{ label: 'Open issues', value: totals?.open, Icon: LocalShippingRounded, tone: '' }, { label: 'Urgent', value: undefined, Icon: CancelRounded, tone: 'error' }, { label: 'In progress', value: totals?.progress, Icon: BuildRounded, tone: 'warning' }, { label: 'Resolved today', value: totals?.resolvedToday, Icon: CheckCircleRounded, tone: 'success' }]
  function refresh() { setLoading(true); setAttempt((value) => value + 1) }
  function sortBy(key: IssueSortKey) { setSort({ key, descending: sort.key === key ? !sort.descending : false }); setPage(1) }
  return <div className="overview-canvas issues-canvas">
    <header className="overview-header">
      <div>
        <div className="flex items-center gap-wp-space-lg"><IconButton className="mobile-menu" aria-label="Open navigation" aria-expanded={navigationOpen} aria-controls="main-navigation" onClick={onOpenNavigation}><MenuRounded fontSize="inherit" /></IconButton><h1 className="type-display-lg-medium">Issues</h1></div>
        <p className="type-text-sm-regular text-wp-text-secondary">{user?.depot?.name ?? 'Peliyagoda'} Hub · Dispatch team</p>
      </div>
      <Button className="issues-refresh" size="md" leadingIcon={<RefreshRounded fontSize="inherit" />} loading={loading} loadingLabel="Refreshing…" disabled={!!selectedId} onClick={refresh}>Refresh issues</Button>
    </header>
    <section className="issues-summary" aria-label="Issue summary">
      {stats.map(({ label, value, Icon, tone }) => <div key={label} className={`issue-stat issue-stat--${tone}`} title={label === 'Urgent' ? 'Urgency is not provided by the current API' : undefined}>
        <div><Icon aria-hidden="true" /><span className="type-text-md-medium">{label}</span></div>
        <strong className="issue-stat-value">{value ?? '—'}</strong>
        {label === 'Urgent' && <span className="sr-only">Urgency is not provided by the current API</span>}
      </div>)}
    </section>
    {error && <div role="alert" className="issues-error type-text-sm-regular"><p>{error}{issues && ' The previous results are shown below.'}</p><Button disabled={loading} onClick={refresh}>Try again</Button></div>}
    <section className="reported-issues" aria-labelledby="reported-issues-title" aria-busy={loading}>
      <div className="issues-section-header"><h2 id="reported-issues-title" className="type-display-md-medium">Reported issues</h2><p className="type-text-sm-regular text-wp-text-secondary">Review delivery issues and coordinate the next action.</p></div>
      <div className="issues-toolbar">
        <div className="route-filters" role="group" aria-label="Filter issues">{tabs.map((tab) => <button key={tab.key} className={filter === tab.key ? 'route-filter--active type-text-sm-medium' : 'type-text-sm-regular'} aria-pressed={filter === tab.key} onClick={() => { setFilter(tab.key); setPage(1) }}>{tab.label}<span className="text-wp-text-quaternary">{tab.count ?? '—'}</span></button>)}</div>
        <div className="route-search issues-search"><SearchRounded aria-hidden="true" fontSize="inherit" /><Input ref={search} placeholder="Search issues, deliveries or reporters" aria-label="Search issues, deliveries or reporters" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} /><kbd className="type-text-xs-medium">⌘K</kbd></div>
      </div>
      <div className="issues-table-scroll"><table className="issues-table">
        <colgroup><col className="issue-col-subject" /><col className="issue-col-reporter" /><col /><col /><col className="issue-col-received" /><col className="issue-col-action" /></colgroup>
        <thead><tr>{([{ key: 'issue', label: 'Issue / affected delivery' }, { key: 'reporter', label: 'Reporter' }, { key: null, label: 'Priority' }, { key: 'status', label: 'Status' }, { key: 'received', label: 'Received' }, { key: null, label: 'Action' }] as const).map(({ key, label }) => <th key={label} scope="col" aria-sort={key && sort.key === key ? sort.descending ? 'descending' : 'ascending' : undefined}>{key ? <button className="type-text-sm-medium" onClick={() => sortBy(key)}>{label}<SwapVertRounded aria-hidden="true" fontSize="inherit" /></button> : <span className="type-text-sm-medium">{label}</span>}</th>)}</tr></thead>
        <tbody>{rows.map((issue) => <tr key={issue.id} className={selectedId === issue.id ? 'issue-row-selected' : ''}>
          <td><strong className="type-text-md-semibold" title={issue.id}>{issueReference(issue)} · {issue.title}</strong><p className="type-text-sm-regular text-wp-text-secondary">{issueSubject(issue)}</p></td>
          <td><div className="issue-reporter"><span className="issue-avatar type-text-md-medium" aria-hidden="true">{issue.reportedBy?.name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('') ?? '?'}</span><div><strong className="type-text-md-semibold">{issue.reportedBy?.name ?? 'Unknown reporter'}</strong><p className="type-text-sm-regular text-wp-text-secondary">{reporterRole(issue.reportedBy?.role)}</p></div></div></td>
          <td className="type-text-xs-regular"><span title="Priority is not provided by the current API" aria-label="Priority unavailable">—</span></td>
          <td className="type-text-xs-regular">{issueStatus[issue.status]}</td>
          <td className="type-text-xs-regular"><time dateTime={issue.createdAt} title={new Date(issue.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Colombo' })}>{receivedTime(issue.createdAt, now)}</time></td>
          <td><Button size="md" className="issue-review-button" aria-label={`Review ${issueReference(issue)}`} onClick={() => setSelectedId(issue.id)}>Review</Button></td>
        </tr>)}</tbody>
      </table></div>
      {!rows.length && <p role="status" className="issues-empty type-text-sm-regular">{loading ? 'Loading reported issues…' : error && !issues ? 'Issues could not be loaded. Try again.' : query.trim() ? 'No issues match your search.' : filter === 'resolved' ? 'No resolved issues yet.' : filter === 'progress' ? 'No issues in progress.' : 'No active issues.'}</p>}
      {pages > 1 && <nav className="issues-pagination" aria-label="Issue pages"><Button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button><span className="type-text-sm-regular">Page {currentPage} of {pages} · {filtered.length} issues</span><Button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</Button></nav>}
    </section>
    {selectedId && accessToken && <IssueReview key={selectedId} id={selectedId} token={accessToken} onClose={() => setSelectedId(null)} onUpdated={(updated) => setIssues((previous) => previous?.map((issue) => issue.id === updated.id ? updated : issue) ?? [updated])} />}
  </div>
}
