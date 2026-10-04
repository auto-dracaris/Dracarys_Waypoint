import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded'
import AcUnitRounded from '@mui/icons-material/AcUnitRounded'
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'

interface DeferredOrderCardProps {
  orderTitle: string
  reason: string
  statusLabel?: string
  newDateLabel?: string
  requirement?: string
  onViewOrder?: () => void
}
export function DeferredOrderCard({ orderTitle, reason, statusLabel = 'Needs attention', newDateLabel = 'Not yet confirmed', requirement, onViewOrder }: DeferredOrderCardProps) {
  return <section className="store-deferred-order">
    <div className="store-deferred-heading"><h3 className="type-text-xl-medium">Order deferred</h3><StatusBadge tone="error" size="md" leadingIcon={<WarningAmberRounded />}>{statusLabel}</StatusBadge></div>
    <div className="store-deferred-details">
      <div className="store-deferred-reason">
        <span className="store-overview-icon-surface">{requirement === 'ambient' ? <Inventory2Outlined aria-hidden="true" /> : <AcUnitRounded aria-hidden="true" />}</span>
        <div><p className="type-text-sm-medium">{orderTitle}</p><p className="type-text-sm-regular">{reason}</p></div>
      </div>
      <div className="store-deferred-date"><p className="type-text-xs-regular">New delivery date</p><p className="type-text-sm-semibold">{newDateLabel}</p></div>
    </div>
    <Button variant="danger" size="sm" trailingIcon={<ArrowForwardRounded />} onClick={onViewOrder}>View order</Button>
  </section>
}
