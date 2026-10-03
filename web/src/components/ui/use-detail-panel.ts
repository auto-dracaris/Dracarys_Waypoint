import { useState } from 'react'
import { loadDetailPanelMode, saveDetailPanelMode, type DetailPanelMode } from '@/lib/detail-panel-preferences'

export interface DetailPanelState {
  mode: DetailPanelMode
  setMode: (mode: DetailPanelMode) => void
  // Only meaningful in modal mode; a side panel is always visible.
  open: boolean
  show: () => void
  close: () => void
}

/** One per page: the display mode is a preference shared by every detail panel, the open state is the page's own. */
export function useDetailPanel(initiallyOpen = false): DetailPanelState {
  const [mode, setModeState] = useState(loadDetailPanelMode)
  const [open, setOpen] = useState(initiallyOpen)
  function setMode(next: DetailPanelMode) {
    setModeState(next)
    saveDetailPanelMode(next)
    // Choosing the pop-up shows the current item straight away.
    if (next === 'modal') setOpen(true)
  }
  return { mode, setMode, open, show: () => setOpen(true), close: () => setOpen(false) }
}
