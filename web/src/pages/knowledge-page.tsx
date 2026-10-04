import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import MenuRounded from '@mui/icons-material/MenuRounded'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/status-badge'
import { useUser } from '@/features/auth/user-context'
import { listDocuments, uploadDocument, approveDocument, retryDocument, downloadOriginal, type KnowledgeList, type KnowledgeDocument } from '@/features/knowledge/api'
import '@/styles/profile.css'

const roles = [{ value: 'dispatcher', label: 'Dispatcher' }, { value: 'store_manager', label: 'Store Manager' }, { value: 'driver', label: 'Driver' }, { value: 'loader', label: 'Loader' }]

export function KnowledgePage({ onOpenNavigation }: { onOpenNavigation: () => void }) {
  const { user, accessToken } = useUser()
  const [title, setTitle] = useState('')
  const [citationUrl, setCitationUrl] = useState('')
  const [audience, setAudience] = useState(roles.map((role) => role.value))
  const [file, setFile] = useState<File | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const uploadKey = useRef<string | null>(null)
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<KnowledgeList | null>(null)
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (!accessToken || user?.role !== 'dispatcher') return
    let stale = false
    listDocuments(accessToken, page).then((data) => { if (!stale) { setResult(data); setError('') } }, (reason) => { if (!stale) setError(reason instanceof Error ? reason.message : 'Could not load documents.') }).finally(() => { if (!stale) setLoading(false) })
    return () => { stale = true }
  }, [accessToken, user?.role, page, refresh])
  useEffect(() => {
    if (!result?.items.some((document) => ['queued', 'processing'].includes(document.ingestion_status))) return
    const timer = window.setInterval(() => setRefresh((value) => value + 1), 5000)
    return () => window.clearInterval(timer)
  }, [result])
  if (user?.role !== 'dispatcher' || !accessToken) return null
  function changed() { uploadKey.current = null; setNotice('') }
  async function upload(event: FormEvent) {
    event.preventDefault()
    if (busy || !accessToken || !user) return
    if (!file || !audience.length) { setError('Choose a document and at least one permitted role.'); return }
    if (!/\.(pdf|txt)$/i.test(file.name) || !file.size || file.size > 20 * 1024 * 1024) { setError('Choose a non-empty PDF or UTF-8 text file up to 20 MiB.'); return }
    if (citationUrl && !/^https?:\/\//i.test(citationUrl)) { setError('Use an http or https source URL.'); return }
    setBusy('upload'); setError(''); setNotice('')
    uploadKey.current ??= crypto.randomUUID()
    try {
      await uploadDocument(accessToken, file, { title: title.trim(), allowed_roles: audience, depot_ids: [user.depotId], citation_url: citationUrl.trim() || null }, uploadKey.current)
      setNotice('Document uploaded. It will be available after processing and your approval.')
      setFile(null); setTitle(''); setCitationUrl(''); uploadKey.current = null
      if (input.current) input.current.value = ''
      setPage(1); setRefresh((value) => value + 1)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not upload the document.') }
    finally { setBusy(null) }
  }
  async function action(document: KnowledgeDocument) {
    if (busy || !accessToken) return
    setBusy(document.id); setError(''); setNotice('')
    try {
      if (document.ingestion_status === 'failed') { await retryDocument(accessToken, document.id, document.active_version); setNotice('Processing retry queued.') }
      else { await approveDocument(accessToken, document.id, document.active_version); setNotice('Document approved for its permitted roles and depots.') }
      setRefresh((value) => value + 1)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update the document.') }
    finally { setBusy(null) }
  }
  async function download(document: KnowledgeDocument) {
    if (busy || !accessToken) return
    setBusy(document.id); setError('')
    try { await downloadOriginal(accessToken, document) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not download the document.') }
    finally { setBusy(null) }
  }
  return <section className="profile-page" aria-labelledby="knowledge-title">
    <header className="profile-header"><div><h1 id="knowledge-title" className="type-display-lg-medium">Knowledge base</h1><p className="type-text-sm-regular">Add shared guidance for your team.</p></div><IconButton className="mobile-menu" aria-label="Open navigation" onClick={onOpenNavigation}><MenuRounded /></IconButton></header>
    <Link className="type-text-sm-medium" to="/profile">← Back to my profile</Link>
    <div className="knowledge-upload"><div className="profile-card profile-form"><h2 className="type-display-xs-medium">Knowledge contribution</h2><StatusBadge>Contributor</StatusBadge><p className="type-text-sm-regular">Upload operating procedures, outlet guidance and handling instructions. Contribution is available to dispatchers only.</p><p className="type-text-sm-regular">New documents are restricted to your assigned depot. Select which roles can use them. Review each document before approving it.</p></div>
      <form className="profile-card profile-form" onSubmit={upload}>
        <h2 className="type-display-xs-medium">Add a document</h2>
        <label className="profile-field type-text-sm-medium">Document title<Input required maxLength={200} value={title} onChange={(e) => { setTitle(e.target.value); changed() }} disabled={!!busy} /></label>
        <label className="profile-field type-text-sm-medium">PDF or text file<Input ref={input} type="file" accept=".pdf,.txt,application/pdf,text/plain" required onChange={(e) => { setFile(e.target.files?.[0] ?? null); changed() }} disabled={!!busy} /><span className="type-text-xs-regular">PDF or UTF-8 text, up to 20 MiB.</span></label>
        <label className="profile-field type-text-sm-medium">Source URL (optional)<Input type="url" value={citationUrl} onChange={(e) => { setCitationUrl(e.target.value); changed() }} placeholder="https://…" disabled={!!busy} /></label>
        <fieldset className="profile-field"><legend className="type-text-sm-medium">Permitted roles</legend><div className="knowledge-roles type-text-sm-regular">{roles.map((role) => <label key={role.value}><input type="checkbox" checked={audience.includes(role.value)} onChange={(e) => { setAudience((values) => e.target.checked ? [...values, role.value] : values.filter((value) => value !== role.value)); changed() }} disabled={!!busy} />{role.label}</label>)}</div></fieldset>
        <Button type="submit" variant="primary" size="md" loading={busy === 'upload'} loadingLabel="Uploading…" disabled={!!busy || !file || !title.trim() || !audience.length}>Upload document</Button>
      </form>
    </div>
    {error && <p role="alert" className="profile-error type-text-sm-regular">{error}</p>}{notice && <p role="status" className="profile-success type-text-sm-regular">{notice}</p>}
    <section className="profile-card profile-form"><div className="profile-dialog-heading knowledge-list"><h2 className="type-display-xs-medium">Documents</h2><Button onClick={() => { setLoading(true); setRefresh((value) => value + 1) }} disabled={!!busy}>Refresh documents</Button></div>
      {loading && <p role="status" className="type-text-sm-regular">Loading documents…</p>}
      {!loading && result && !result.items.length && <p className="type-text-sm-regular">No documents have been added yet.</p>}
      <ul className="knowledge-list">{result?.items.map((document) => <li key={document.id} className="profile-card knowledge-row"><div><h3 className="type-text-md-medium">{document.metadata.title}</h3><p className="type-text-xs-regular">Version {document.active_version} · {document.chunks ?? 0} chunks · Depot {document.metadata.depot_ids.join(', ')}</p><p className="type-text-xs-regular">Available to: {document.metadata.allowed_roles.map((value) => roles.find((role) => role.value === value)?.label ?? value).join(', ')}</p>{document.error_code && <p className="profile-error type-text-xs-regular">Processing failed: {document.error_code}</p>}</div><div className="knowledge-actions"><Button onClick={() => void download(document)} disabled={!!busy}>Download original</Button><StatusBadge tone={document.approved ? 'success' : document.ingestion_status === 'failed' ? 'error' : 'neutral'}>{document.approved ? 'Approved' : document.ingestion_status === 'ready' ? 'Awaiting approval' : document.ingestion_status}</StatusBadge>{!document.approved && ['ready', 'failed'].includes(document.ingestion_status) && <Button onClick={() => void action(document)} loading={busy === document.id} disabled={!!busy}>{document.ingestion_status === 'failed' ? 'Retry processing' : 'Approve document'}</Button>}</div></li>)}</ul>
      <div className="knowledge-actions"><Button onClick={() => { setPage((value) => value - 1); setLoading(true) }} disabled={page === 1 || loading || !!busy}>Previous</Button><span className="type-text-sm-regular">Page {page}{result ? ` · ${result.total} documents` : ''}</span><Button onClick={() => { setPage((value) => value + 1); setLoading(true) }} disabled={!result || page * result.limit >= result.total || loading || !!busy}>Next</Button></div>
    </section>
  </section>
}
