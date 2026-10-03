import { useEffect, useRef, type ReactNode } from 'react'
import ViewSidebarOutlined from '@mui/icons-material/ViewSidebarOutlined'
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import { IconButton } from './icon-button'
import { Tooltip } from './tooltip'
import type { DetailPanelState } from './use-detail-panel'
import './detail-panel.css'

// The details of one selected record, docked beside its table or opened over it; the viewer picks from the toolbar.
export function DetailPanel({ panel, label, className = '', children }: { panel: DetailPanelState; label: string; className?: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const modal = panel.mode === 'modal'
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (panel.open && !element.open) element.showModal()
    else if (!panel.open && element.open) element.close()
  }, [modal, panel.open])
  const toolbar = <div className="wp-detail-panel-toolbar" role="group" aria-label="Panel display">
    <Tooltip content="Show as side panel" placement="bottom"><IconButton size="sm" aria-label="Show as side panel" aria-pressed={!modal} onClick={() => panel.setMode('side')}><ViewSidebarOutlined fontSize="inherit" /></IconButton></Tooltip>
    <Tooltip content="Show as pop-up" placement="bottom"><IconButton size="sm" aria-label="Show as pop-up" aria-pressed={modal} onClick={() => panel.setMode('modal')}><OpenInNewRounded fontSize="inherit" /></IconButton></Tooltip>
    {modal && <IconButton size="sm" className="wp-detail-panel-close" aria-label="Close details" onClick={panel.close}><CloseRounded fontSize="inherit" /></IconButton>}
  </div>
  // `fleet-details` keeps the existing panel styles of the pages that adopt this.
  if (!modal) return <aside className={`wp-detail-panel fleet-details ${className}`} aria-label={label}>{toolbar}{children}</aside>
  return <dialog ref={dialog} className={`wp-detail-panel wp-detail-panel--modal fleet-details ${className}`} aria-label={label} onClose={panel.close}
    // Only the backdrop is the dialog itself; everything inside is a child.
    onClick={event => { if (event.target === event.currentTarget) panel.close() }}>{toolbar}{children}</dialog>
}
