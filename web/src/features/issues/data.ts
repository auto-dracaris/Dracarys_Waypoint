import type { Issue } from './api'

export const issueStatus = { open: 'Open', acknowledged: 'In progress', resolved: 'Resolved' }
export const issueReference = (issue: Issue) => `ISS-${issue.id.slice(0, 8).toUpperCase()}`
export const reporterRole = (role?: string) => role ? role.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()) : 'Unknown role'
export const issueSubject = (issue: Issue) => [issue.order?.reference, issue.order?.outlet?.name, issue.trip?.vehicle, issue.trip && `Trip ${issue.trip.tripNo}`, issue.affectedCases != null && `${issue.affectedCases} cases affected`].filter(Boolean).join(' · ') || 'No delivery details'

const localDay = (date: string | Date) => new Date(date).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })
export function issueTotals(issues: Issue[], now = new Date()) {
  return {
    open: issues.filter((issue) => issue.status === 'open').length,
    progress: issues.filter((issue) => issue.status === 'acknowledged').length,
    active: issues.filter((issue) => issue.status !== 'resolved').length,
    resolved: issues.filter((issue) => issue.status === 'resolved').length,
    resolvedToday: issues.filter((issue) => issue.status === 'resolved' && issue.resolvedAt && localDay(issue.resolvedAt) === localDay(now)).length,
  }
}

export function receivedTime(date: string, now = Date.now()) {
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return '—'
  const minutes = Math.max(0, Math.floor((now - value.getTime()) / 60000))
  const age = minutes < 1 ? 'just now' : minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`
  return `${value.toLocaleTimeString('en-GB', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit' })} · ${age}`
}

export type IssueFilter = 'active' | 'progress' | 'resolved'
export type IssueSortKey = 'issue' | 'reporter' | 'status' | 'received'
export function visibleIssues(issues: Issue[], filter: IssueFilter, query: string, key: IssueSortKey, descending: boolean) {
  const search = query.trim().toLowerCase()
  const values = issues.filter((issue) => (filter === 'active' ? issue.status !== 'resolved' : filter === 'progress' ? issue.status === 'acknowledged' : issue.status === 'resolved') && [issueReference(issue), issue.id, issue.title, issue.description, issueSubject(issue), issue.reportedBy?.name, reporterRole(issue.reportedBy?.role)].join(' ').toLowerCase().includes(search))
  const sortValue = (issue: Issue) => key === 'issue' ? issue.title : key === 'reporter' ? issue.reportedBy?.name ?? '' : key === 'status' ? issueStatus[issue.status] : issue.createdAt
  return values.sort((a, b) => (key === 'received' ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() : sortValue(a).localeCompare(sortValue(b))) * (descending ? -1 : 1))
}
