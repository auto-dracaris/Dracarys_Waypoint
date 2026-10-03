const sidebarPreferenceKey = 'waypoint:sidebar-collapsed'

export function loadSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(sidebarPreferenceKey) === 'true'
  } catch {
    return false
  }
}

export function saveSidebarCollapsed(collapsed: boolean): void {
  try {
    window.localStorage.setItem(sidebarPreferenceKey, String(collapsed))
  } catch {
    /* The toggle still works when browser storage is unavailable. */
  }
}
