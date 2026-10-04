import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import ChatBubbleOutlineRounded from '@mui/icons-material/ChatBubbleOutlineRounded'
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import SendRounded from '@mui/icons-material/SendRounded'
import AddRounded from '@mui/icons-material/AddRounded'
import { IconButton } from '@/components/ui/icon-button'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useUser } from '@/features/auth/user-context'
import { sendChat, type ChatSource } from './api'
import { AssistantAnswer } from './assistant-answer'
import './floating-chat.css'

interface Message { id: number; author: 'user' | 'assistant'; text: string; sources?: ChatSource[] }

function ChatPanel({ token, role }: { token: string; role: 'dispatcher' | 'store_manager' }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const launcher = useRef<HTMLButtonElement>(null)
  const composer = useRef<HTMLTextAreaElement>(null)
  const end = useRef<HTMLDivElement>(null)
  const request = useRef<AbortController | null>(null)
  const nextId = useRef(1)
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [failedText, setFailedText] = useState('')
  const suggestions = role === 'dispatcher'
    ? ['Summarize today’s orders', 'Explain the order cutoff', 'What is my assigned role?']
    : ['Show my current orders', 'When can I place my next order?', 'Explain the order cutoff']
  useEffect(() => {
    if (!open) { dialog.current?.close(); return }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.showModal(); composer.current?.focus()
    return () => { document.body.style.overflow = previousOverflow }
  }, [open])
  useEffect(() => {
    if (!closing) return
    const timeout = window.setTimeout(() => { setOpen(false); setClosing(false) }, 220)
    return () => window.clearTimeout(timeout)
  }, [closing])
  useEffect(() => {
    if (open) end.current?.scrollIntoView({ block: 'end' })
  }, [messages, busy, open])
  useEffect(() => () => { request.current?.abort() }, [token])

  function close() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setOpen(false); return }
    setClosing(true)
  }
  async function send(text: string, retry = false) {
    const question = text.trim()
    if (!question || question.length > 2000 || request.current) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true); setError(''); setFailedText(''); setDraft('')
    if (!retry) setMessages((previous) => [...previous, { id: nextId.current++, author: 'user', text: question }])
    try {
      const result = await sendChat(token, question, conversationId, controller.signal)
      if (request.current !== controller) return
      setConversationId(result.conversation_id)
      setMessages((previous) => [...previous, { id: nextId.current++, author: 'assistant', text: result.answer, sources: result.sources }])
    } catch (reason) {
      if (request.current !== controller) return
      setError(reason instanceof Error ? reason.message : 'Could not get a reply. Please try again.')
      setFailedText(question)
    } finally {
      if (request.current === controller) { request.current = null; setBusy(false); if (dialog.current?.open) composer.current?.focus() }
    }
  }
  function submit(event: FormEvent) { event.preventDefault(); void send(draft) }
  function newConversation() { if (request.current) return; setMessages([]); setConversationId(undefined); setDraft(''); setError(''); setFailedText(''); composer.current?.focus() }

  return <div className="assistant-widget">
    <IconButton ref={launcher} className="assistant-launcher" aria-label="Open WayPoint assistant" aria-haspopup="dialog" aria-expanded={open} aria-controls="waypoint-chat" onClick={() => setOpen(true)}><ChatBubbleOutlineRounded /></IconButton>
    <dialog ref={dialog} id="waypoint-chat" className={`assistant-panel${closing ? ' assistant-panel--closing' : ''}`} aria-labelledby="assistant-title" aria-describedby="assistant-description" onCancel={(event) => { event.preventDefault(); close() }} onClose={() => { setOpen(false); setClosing(false); launcher.current?.focus() }} onClick={(event) => {
      if (event.target !== event.currentTarget) return
      const bounds = event.currentTarget.getBoundingClientRect()
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close()
    }}>
      <header className="assistant-header"><span className="assistant-brand"><AutoAwesomeRounded aria-hidden="true" /></span><div className="assistant-heading"><h2 id="assistant-title" className="type-text-lg-semibold">WayPoint Assistant</h2><p id="assistant-description" className="type-text-xs-regular">Orders, account details and shared guidance</p></div><IconButton aria-label="Start a new conversation" title="New conversation" onClick={newConversation} disabled={busy}><AddRounded /></IconButton><IconButton aria-label="Close assistant" onClick={close}><CloseRounded /></IconButton></header>
      <div className="assistant-messages" aria-label="Conversation">
        {!messages.length && <div className="assistant-welcome"><span className="assistant-welcome-icon"><AutoAwesomeRounded aria-hidden="true" /></span><h3 className="type-display-xs-medium">How can I help?</h3><p className="type-text-sm-regular">Ask a question about your orders or your team’s guidance.</p><div className="assistant-suggestions">{suggestions.map((question) => <Button key={question} onClick={() => void send(question)} disabled={busy}>{question}</Button>)}</div></div>}
        <div role="log" aria-live="polite" aria-relevant="additions" className="assistant-log">{messages.map((message) => <article key={message.id} className={`assistant-message assistant-message--${message.author}`} aria-label={message.author === 'user' ? 'Your message' : 'Assistant reply'}><p className="assistant-author type-text-xs-medium">{message.author === 'user' ? 'You' : 'WayPoint Assistant'}</p>{message.author === 'assistant' ? <AssistantAnswer text={message.text} sources={message.sources} /> : <p className="assistant-answer type-text-sm-regular">{message.text}</p>}{!!message.sources?.length && <details className="assistant-sources"><summary className="type-text-xs-medium">Sources ({message.sources.length})</summary><ol>{message.sources.map((source, index) => <li key={`${source.id}-${index}`} className="type-text-xs-regular"><strong>{source.title}</strong>{source.page != null && <span> · Page {source.page}</span>}{source.version != null && <span> · Version {source.version}</span>}<p>{source.text}</p></li>)}</ol></details>}</article>)}</div>
        {busy && <p role="status" className="assistant-thinking type-text-sm-regular">Looking into your question…</p>}
        {error && <div className="assistant-error"><p role="alert" className="type-text-sm-regular">{error}</p>{failedText && <Button size="sm" onClick={() => void send(failedText, true)} disabled={busy}>Retry message</Button>}</div>}
        <div ref={end} />
      </div>
      <form className="assistant-composer" onSubmit={submit}>
        <label htmlFor="assistant-message" className="type-text-sm-medium">Message</label>
        <div className="assistant-compose-row"><Textarea ref={composer} id="assistant-message" name="message" rows={2} value={draft} maxLength={2000} placeholder="Ask WayPoint…" disabled={busy} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(draft) } }} /><IconButton type="submit" aria-label="Send message" className="assistant-send" disabled={busy || !draft.trim()}><SendRounded /></IconButton></div>
        <div className="assistant-compose-footer"><p className="type-text-xs-regular">Check important details against the sources.</p>{busy ? <Button variant="link" size="xs" onClick={() => request.current?.abort()}>Stop</Button> : <span className="type-text-xs-regular">{draft.length}/2000</span>}</div>
      </form>
    </dialog>
  </div>
}

export function FloatingChat() {
  const { user, accessToken } = useUser()
  const { pathname } = useLocation()
  if (!user || !accessToken || !['dispatcher', 'store_manager'].includes(user.role) || ['/login', '/register', '/forgot-password'].includes(pathname)) return null
  return <ChatPanel key={`${user.id}:${user.role}:${user.depotId}:${user.outletId}`} token={accessToken} role={user.role as 'dispatcher' | 'store_manager'} />
}
