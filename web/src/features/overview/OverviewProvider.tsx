import { useState } from 'react'
import type { ReactNode } from 'react'
import { OverviewContext } from './overviewState'

export function OverviewProvider({ children }: { children: ReactNode }) {
  const [date, setDate] = useState('2026-09-26')
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [read, setRead] = useState(() => sessionStorage.getItem('waypoint-notifications-read') === 'true')
  const [notice, showNotice] = useState('')
  const markRead = () => { setRead(true); sessionStorage.setItem('waypoint-notifications-read', 'true') }
  return <OverviewContext value={{ date, setDate, filter, setFilter, search, setSearch, read, markRead, notice, showNotice }}>{children}</OverviewContext>
}
