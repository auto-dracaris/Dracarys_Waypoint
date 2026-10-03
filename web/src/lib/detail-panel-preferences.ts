export type DetailPanelMode = 'side' | 'modal'

const detailPanelModeKey = 'waypoint:detail-panel-mode'

export function loadDetailPanelMode(): DetailPanelMode {
  try { return window.localStorage.getItem(detailPanelModeKey) === 'modal' ? 'modal' : 'side' }
  catch { return 'side' }
}

export function saveDetailPanelMode(mode: DetailPanelMode): void {
  try { window.localStorage.setItem(detailPanelModeKey, mode) }
  catch { /* The toggle still works when browser storage is unavailable. */ }
}
