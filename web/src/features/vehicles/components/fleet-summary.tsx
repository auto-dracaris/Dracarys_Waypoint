import LocalShippingRounded from '@mui/icons-material/LocalShippingRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import BuildRounded from '@mui/icons-material/BuildRounded'
import CancelRounded from '@mui/icons-material/CancelRounded'
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import type { FleetTotals } from '../data'

export function FleetSummary({ totals, onReview }: { totals: FleetTotals | null; onReview: () => void }) {
  const cards = [
    { label: 'Vehicles', value: totals?.total, Icon: LocalShippingRounded, tone: 'default' },
    { label: 'Available', value: totals?.available, Icon: CheckCircleRounded, tone: 'success' },
    { label: 'In workshop', value: totals?.inWorkshop, Icon: BuildRounded, tone: 'warning' },
    { label: 'Unavailable', value: totals?.unavailable, Icon: CancelRounded, tone: 'error' },
  ]
  const reviewCount = totals?.needsReview ?? 0
  return (
    <section className="fleet-summary" aria-label="Fleet summary">
      {cards.map(({ label, value, Icon, tone }) => (
        <div key={label} className={`fleet-stat fleet-stat--${tone}`}>
          <div>
            <Icon fontSize="inherit" />
            <span className="text-wp-text-secondary type-text-md-medium">{label}</span>
          </div>
          <strong className="type-display-xl-semibold">{value ?? '—'}</strong>
        </div>
      ))}
      {reviewCount > 0 && (
        <div className="fleet-review">
          <WarningAmberRounded fontSize="inherit" />
          <div>
            <h2 className="type-text-sm-semibold">
              {reviewCount} {reviewCount === 1 ? 'vehicle needs' : 'vehicles need'} review
            </h2>
            <p className="text-wp-text-tertiary type-text-xs-regular">Not available, but still holding draft or planned trips.</p>
            <button onClick={onReview} className="fleet-review-link type-text-sm-semibold">
              Review impact <ArrowForwardRounded fontSize="inherit" />
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
