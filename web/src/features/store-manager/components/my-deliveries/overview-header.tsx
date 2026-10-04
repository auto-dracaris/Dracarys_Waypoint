import CalendarTodayRounded from '@mui/icons-material/CalendarTodayRounded'
import ShoppingCartRounded from '@mui/icons-material/ShoppingCartRounded'
import { Button } from '@/components/ui/button'
import { NotificationDialog } from '../notification-dialog'
import { formatLongDay } from '../../order-format'

export function OverviewHeader({ date, onPlaceOrder }: { date: string; onPlaceOrder: () => void }) {
  const day = formatLongDay(date)
  const shortDay = new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
  return <header className="store-overview-header">
    <div><h1 className="type-display-lg-medium">My deliveries</h1><p className="type-text-sm-regular">{day} · Your outlet at a glance</p></div>
    <div className="store-overview-actions">
      <span className="store-overview-date type-text-md-semibold" aria-label={`Dashboard date: ${day}`}><CalendarTodayRounded aria-hidden="true" />{shortDay}</span>
      <Button variant="primary" size="md" trailingIcon={<ShoppingCartRounded />} onClick={onPlaceOrder}>Place Order</Button>
      <NotificationDialog />
    </div>
  </header>
}
