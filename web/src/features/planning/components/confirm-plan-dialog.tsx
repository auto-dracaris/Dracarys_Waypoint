import { useEffect, useRef } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import RouteRounded from '@mui/icons-material/RouteRounded'
import { Button } from '@/components/ui/button'
// The hub's dialog styles live with the order deferral dialog.
import '@/styles/orders.css'

/** Asks the dispatcher to confirm a planning action, in place of the browser's own prompt. */
export function ConfirmPlanDialog({ title, description, confirmLabel, onClose, onConfirm }: { title: string; description: string; confirmLabel: string; onClose: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => element.close()
  }, [])
  return (
    <dialog
      ref={dialog}
      className="stage-notice order-defer-dialog"
      aria-labelledby="plan-confirm-title"
      aria-describedby="plan-confirm-description"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') event.stopPropagation()
      }}
    >
      <header className="order-defer-header">
        <RouteRounded className="order-defer-icon" fontSize="inherit" />
        <div>
          <h2 id="plan-confirm-title" className="type-text-xl-medium">
            {title}
          </h2>
          <p id="plan-confirm-description" className="type-text-sm-regular text-wp-text-secondary">
            {description}
          </p>
        </div>
        <button type="button" className="order-panel-close" onClick={onClose} aria-label="Close confirmation">
          <CloseRounded fontSize="inherit" />
        </button>
      </header>
      <footer className="order-defer-footer">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" autoFocus onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </footer>
    </dialog>
  )
}
