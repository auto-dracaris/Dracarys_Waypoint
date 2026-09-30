import { createContext, useContext } from 'react'
export type OverviewState = {
  date: string; setDate: (date: string) => void
  filter: string; setFilter: (filter: string) => void
  search: string; setSearch: (search: string) => void
  read: boolean; markRead: () => void
  notice: string; showNotice: (message: string) => void
}
export const OverviewContext = createContext<OverviewState | null>(null)
export function useOverviewState() {
  const state = useContext(OverviewContext)
  if (!state) throw new Error('Overview provider is required')
  return state
}
