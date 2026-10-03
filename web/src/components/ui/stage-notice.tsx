import { IconButton } from '@/components/ui/icon-button'
import { useEffect, useRef } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import { Button } from './button'

export function StageNotice({ title, onClose, returnLabel = 'Back to overview' }: { title: string | null; onClose: () => void; returnLabel?: string }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (title) dialog.current?.showModal()
    else dialog.current?.close()
  }, [title])
  return (
    <dialog ref={dialog} className="stage-notice" onCancel={onClose} onClose={onClose} aria-labelledby="notice-title" aria-describedby="notice-description">
      <div className="flex items-center justify-between gap-wp-space-xl">
        <h2 id="notice-title" className="type-text-lg-semibold">{title}</h2>
        <IconButton type="button" onClick={onClose} aria-label="Close notice" className=""><CloseRounded fontSize="inherit" /></IconButton>
      </div>
      <p id="notice-description" className="mt-wp-space-lg text-wp-text-secondary type-text-sm-regular">This will be added in the next development stage.</p>
      <Button onClick={onClose} className="mt-wp-space-3xl">{returnLabel}</Button>
    </dialog>
  )
}
