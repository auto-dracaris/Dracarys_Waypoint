import { Button } from '@/components/ui/button'
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded'

interface NextRunCardProps {
  title?: string
  dateLabel: string
  cutoffTime: string
  onPlaceOrder?: () => void
}
export function NextRunCard({ title = 'Order for the next run', dateLabel, cutoffTime, onPlaceOrder }: NextRunCardProps) {
  return <section className="store-next-run">
    <div className="store-overview-section-heading"><h2 className="type-display-md-medium">{title}</h2></div>
    <div className="store-next-run-body">
      <div className="store-next-run-copy">
        <div className="store-run-schedule"><span className="store-overview-icon-surface"><CalendarMonthRounded aria-hidden="true" /></span><div><h3 className="type-text-md-semibold">{dateLabel}</h3><p className="type-text-sm-regular">Order cutoff: {cutoffTime}</p></div></div>
        <p className="type-text-sm-regular">Orders submitted after cutoff move to the following eligible run.</p>
      </div>
      <Button variant="primary" size="md" onClick={onPlaceOrder}>Place order</Button>
    </div>
  </section>
}
