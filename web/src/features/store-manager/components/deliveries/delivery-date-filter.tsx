import CalendarTodayRounded from '@mui/icons-material/CalendarTodayRounded'
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import { Input } from '@/components/ui/input'
import { IconButton } from '@/components/ui/icon-button'

export function DeliveryDateFilter({ date, onDate, header = false }: { date: string; onDate: (date: string) => void; header?: boolean }) {
  const label = date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : header ? 'All delivery dates' : 'Delivery date'
  return (
    <div className={`store-delivery-date-filter ${header ? 'store-delivery-date-filter--header' : ''}`}>
      <label className={`store-delivery-date-label ${header ? 'type-text-md-semibold' : 'type-text-sm-medium'}`}>
        <CalendarTodayRounded aria-hidden="true" />
        <span aria-hidden="true">{label}</span>
        {header && <ExpandMoreRounded aria-hidden="true" />}
        <Input type="date" aria-label={header ? 'Filter deliveries by date' : 'Delivery date'} value={date} onChange={(event) => onDate(event.target.value)} onClick={(event) => {
          try { event.currentTarget.showPicker?.() } catch { /* The native input remains usable when a picker is unavailable. */ }
        }} />
      </label>
      {date && <IconButton size="sm" aria-label={header ? 'Clear header delivery date' : 'Clear delivery date'} onClick={() => onDate('')}><CloseRounded /></IconButton>}
    </div>
  )
}
