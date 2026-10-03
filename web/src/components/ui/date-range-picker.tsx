import { useRef, useState } from 'react'
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined'
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'
import { Button } from './button'

export function DateRangePicker() {
  const details = useRef<HTMLDetailsElement>(null)
  const [range, setRange] = useState({ start: '2026-09-15', end: '2026-09-28' })
  const [draft, setDraft] = useState(range)
  const format = (value: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`))
  const valid = draft.start && draft.end && draft.start <= draft.end
  const startYear = range.start.slice(0, 4)
  const endYear = range.end.slice(0, 4)
  const label = `${format(range.start)}${startYear !== endYear ? `, ${startYear}` : ''} – ${format(range.end)}, ${endYear}`
  return <details ref={details} className="date-range-picker" onKeyDown={event => { if (event.key === 'Escape' && details.current) { details.current.open = false; details.current.querySelector('summary')?.focus() } }}>
    <summary className="wp-button wp-button--outline type-text-sm-semibold"><CalendarTodayOutlined fontSize="inherit" /><span>{label}</span><ExpandMoreRounded fontSize="inherit" /></summary>
    <form className="date-range-form" onSubmit={event => { event.preventDefault(); if (valid) { setRange(draft); if (details.current) details.current.open = false } }}>
      <label className="type-text-sm-medium">From<input type="date" value={draft.start} max={draft.end || undefined} required onChange={event => setDraft({ ...draft, start: event.target.value })} /></label>
      <label className="type-text-sm-medium">To<input type="date" value={draft.end} min={draft.start || undefined} required onChange={event => setDraft({ ...draft, end: event.target.value })} /></label>
      {!valid && <p className="text-wp-red-700 type-text-xs-regular">Choose an end date on or after the start date.</p>}
      <Button type="submit" variant="primary" disabled={!valid}>Apply dates</Button>
    </form>
  </details>
}
