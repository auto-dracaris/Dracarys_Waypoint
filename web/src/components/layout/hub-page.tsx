import type { ReactNode } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { HubController } from '@/features/hub/use-hub-controller'

export function HubPage({ children }: { children: (hub: HubController) => ReactNode }) {
  return children(useOutletContext<HubController>())
}
