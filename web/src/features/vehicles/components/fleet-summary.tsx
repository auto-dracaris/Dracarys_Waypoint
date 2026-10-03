import LocalShippingRounded from '@mui/icons-material/LocalShippingRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import BuildRounded from '@mui/icons-material/BuildRounded'
import CancelRounded from '@mui/icons-material/CancelRounded'
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import type { initialFleetTotals } from '../data'

export function FleetSummary({ totals, reviewCount, onReview }: { totals: typeof initialFleetTotals; reviewCount: number; onReview: () => void }) {
  const cards = [
    { label: 'Vehicles', value: totals.vehicles, Icon: LocalShippingRounded, tone: 'default' },
    { label: 'Available', value: totals.Available, Icon: CheckCircleRounded, tone: 'success' },
    { label: 'In workshop', value: totals['In workshop'], Icon: BuildRounded, tone: 'warning' },
    { label: 'Unavailable', value: totals.Unavailable, Icon: CancelRounded, tone: 'error' },
  ]
  return (
    <section className="fleet-summary" aria-label="Fleet summary">
      {cards.map(({ label, value, Icon, tone }) => (
        <div key={label} className={`fleet-stat fleet-stat--${tone}`}>
          <div>
            <Icon fontSize="inherit" />
            <span className="text-wp-text-secondary type-text-md-medium">{label}</span>
          </div>
          <strong className="type-display-xl-semibold">{value}</strong>
        </div>
      ))}
      <div className="fleet-review">
        <WarningAmberRounded fontSize="inherit" />
        <div>
          <h2 className="type-text-sm-semibold">
            {reviewCount} vehicle {reviewCount === 1 ? 'change needs' : 'changes need'} review
          </h2>
          <p className="text-wp-text-tertiary type-text-xs-regular">Review affected draft trips before publishing.</p>
          <button onClick={onReview} className="fleet-review-link type-text-sm-semibold">
            Review impact <ArrowForwardRounded fontSize="inherit" />
          </button>
        </div>
      </div>
    </section>
  )
}
