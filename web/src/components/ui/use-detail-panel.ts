import { useState } from 'react'
import type { DetailPanelMode } from '@/lib/detail-panel-preferences'

export interface DetailPanelState {
  mode: DetailPanelMode
  setMode: (mode: DetailPanelMode) => void
  // Only meaningful in modal mode; a side panel is always visible.
  open: boolean
  show: () => void
  close: () => void
}

/** Every page starts docked; opening a pop-up is temporary until it is closed. */
export function useDetailPanel(initiallyOpen = false): DetailPanelState {
  const [mode, setModeState] = useState<DetailPanelMode>('side')
  const [open, setOpen] = useState(initiallyOpen)
  function setMode(next: DetailPanelMode) {
    setModeState(next)
    // Choosing the pop-up shows the current item straight away.
    if (next === 'modal') setOpen(true)
  }
  function close() {
    setOpen(false)
    setModeState('side')
  }
  return { mode, setMode, open, show: () => setOpen(true), close }
}
