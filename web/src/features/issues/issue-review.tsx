import { useEffect, useRef, useState } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Textarea } from '@/components/ui/textarea'
import { acknowledgeIssue, fetchIssue, resolveIssue, type Issue } from './api'
import { issueReference, issueStatus, issueSubject, receivedTime, reporterRole } from './data'

export function IssueReview({ id, token, onClose, onUpdated }: { id: string; token: string; onClose: () => void; onUpdated: (issue: Issue) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const saving = useRef(false)
  const [issue, setIssue] = useState<Issue | null>(null)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<'acknowledge' | 'resolve' | null>(null)
  const [message, setMessage] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => { dialog.current?.showModal() }, [])
  useEffect(() => {
    let stale = false
    fetchIssue(token, id).then((data) => {
      if (!stale) { setIssue(data); setLoadError('') }
    }, (error: Error) => { if (!stale) setLoadError(error.message) })
    return () => { stale = true }
  }, [id, token, attempt])
  async function save(action: 'acknowledge' | 'resolve') {
    if (!issue || saving.current) return
    if (action === 'resolve' && !note.trim()) { setSaveError('Enter what was done to resolve this issue.'); return }
    saving.current = true
    setBusy(action)
    setSaveError('')
    try {
      const updated = await (action === 'acknowledge' ? acknowledgeIssue(token, issue.id) : resolveIssue(token, issue.id, note.trim()))
      setIssue(updated)
      onUpdated(updated)
      setMessage(action === 'acknowledge' ? 'Issue acknowledged.' : 'Issue resolved.')
    } catch (error) { setSaveError(error instanceof Error ? error.message : 'Could not update the issue.') }
    finally { saving.current = false; setBusy(null) }
  }
  return <dialog ref={dialog} className="issue-review" aria-labelledby="issue-review-title" onCancel={(event) => { if (saving.current) event.preventDefault() }} onClose={onClose}>
    <header className="issue-review-header">
      <h2 id="issue-review-title" className="type-display-xs-medium">Review issue</h2>
      <IconButton aria-label="Close issue review" disabled={!!busy} onClick={onClose}><CloseRounded fontSize="inherit" /></IconButton>
    </header>
    {loadError ? <div role="alert"><p>{loadError}</p><Button onClick={() => setAttempt((value) => value + 1)}>Try again</Button></div> : !issue ? <p role="status">Loading issue details…</p> : <>
      <div><p className="type-text-xs-medium text-wp-text-tertiary">{issueReference(issue)}</p><h3 className="type-text-xl-semibold">{issue.title}</h3><p className="type-text-sm-regular text-wp-text-secondary">{issueSubject(issue)}</p></div>
      <dl className="issue-review-facts type-text-sm-regular">
        <div><dt>Status</dt><dd>{issueStatus[issue.status]}</dd></div>
        <div><dt>Reporter</dt><dd>{issue.reportedBy?.name ?? 'Unknown reporter'} · {reporterRole(issue.reportedBy?.role)}</dd></div>
        <div><dt>Received</dt><dd>{receivedTime(issue.createdAt)}</dd></div>
        {issue.affectedCases != null && <div><dt>Affected cases</dt><dd>{issue.affectedCases}</dd></div>}
      </dl>
      <section><h3 className="type-text-md-semibold">Reported details</h3><p className="issue-note type-text-sm-regular">{issue.description}</p></section>
      {issue.photoUrl && <a href={issue.photoUrl} target="_blank" rel="noreferrer"><img className="issue-photo" src={issue.photoUrl} alt="Photo attached by the issue reporter" /></a>}
      {issue.status === 'resolved' ? <section><h3 className="type-text-md-semibold">Resolution</h3><p className="issue-note type-text-sm-regular">{issue.resolutionNote ?? 'No resolution note'}</p><p className="type-text-xs-regular text-wp-text-secondary">{issue.resolvedBy?.name ?? 'Dispatcher'}{issue.resolvedAt && ` · ${new Date(issue.resolvedAt).toLocaleString('en-GB', { timeZone: 'Asia/Colombo' })}`}</p></section> : <form onSubmit={(event) => { event.preventDefault(); void save('resolve') }}>
        <label className="issue-resolution-label type-text-sm-medium" htmlFor="issue-resolution">Resolution note</label>
        <Textarea id="issue-resolution" value={note} onChange={(event) => setNote(event.target.value)} required maxLength={500} rows={4} disabled={!!busy} placeholder="Describe what was done to resolve this issue" />
        <p className="type-text-xs-regular text-wp-text-tertiary">{note.length}/500</p>
        <div className="issue-review-actions">
          {issue.status === 'open' && <Button loading={busy === 'acknowledge'} disabled={!!busy} onClick={() => void save('acknowledge')}>Acknowledge</Button>}
          <Button type="submit" variant="primary" loading={busy === 'resolve'} disabled={!!busy || !note.trim()}>Resolve issue</Button>
        </div>
      </form>}
      {saveError && <p role="alert" className="text-wp-text-error-primary type-text-sm-regular">{saveError}</p>}
      {message && <p role="status" className="type-text-sm-medium">{message}</p>}
    </>}
  </dialog>
}
