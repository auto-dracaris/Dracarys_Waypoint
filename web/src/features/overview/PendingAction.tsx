import type { ReactNode } from 'react'
import { useOverviewState } from './overviewState'

export function PendingAction({ feature, children, className = 'button', onActivate }: { feature: string; children: ReactNode; className?: string; onActivate?: () => void }) {
  const { showNotice } = useOverviewState()
  return <button type="button" className={className} onClick={() => { showNotice(`${feature} will be added in the next development stage. This preview currently includes Overview, Trip Details, and notifications.`); onActivate?.() }}>{children}</button>
}
