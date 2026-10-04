import { useRef, useState } from 'react'
import CalendarTodayRounded from '@mui/icons-material/CalendarTodayRounded'
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface OrderDateRange { from: string; to: string }
const label = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
export function OrderDateRangeFilter({ value, onChange }: { value: OrderDateRange; onChange: (value: OrderDateRange) => void }) {
  const details = useRef<HTMLDetailsElement>(null)
  const [draft, setDraft] = useState(value)
  const text = value.from && value.to ? `${label(value.from)} – ${label(value.to)}` : value.from ? `From ${label(value.from)}` : value.to ? `Until ${label(value.to)}` : 'All dates'
  return <details ref={details} className="store-order-date-range" onToggle={(event) => { if (event.currentTarget.open) setDraft(value) }}>
    <summary className="type-text-md-semibold"><CalendarTodayRounded aria-hidden="true" />{text}<ExpandMoreRounded aria-hidden="true" /></summary>
    <form className="store-order-date-popover" onSubmit={(event) => { event.preventDefault(); onChange(draft); if (details.current) details.current.open = false }}>
      <p className="type-text-md-semibold">Requested delivery dates</p>
      <label className="type-text-sm-medium" htmlFor="order-date-from">From</label><Input id="order-date-from" type="date" value={draft.from} max={draft.to || undefined} onChange={(event) => setDraft({ ...draft, from: event.target.value })} />
      <label className="type-text-sm-medium" htmlFor="order-date-to">To</label><Input id="order-date-to" type="date" value={draft.to} min={draft.from || undefined} onChange={(event) => setDraft({ ...draft, to: event.target.value })} />
      <div><Button size="sm" onClick={() => { onChange({ from: '', to: '' }); setDraft({ from: '', to: '' }); if (details.current) details.current.open = false }}>Clear</Button><Button type="submit" variant="primary" size="sm">Apply dates</Button></div>
    </form>
  </details>
}
