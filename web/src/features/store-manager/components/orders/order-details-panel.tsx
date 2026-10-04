import CheckRounded from '@mui/icons-material/CheckRounded'
import ViewInArOutlined from '@mui/icons-material/ViewInArOutlined'
import AcUnitRounded from '@mui/icons-material/AcUnitRounded'
import ScheduleRounded from '@mui/icons-material/ScheduleRounded'
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import type { OrderTableRow } from './orders-table'
const orderStatusTones = { yellow: 'warning', green: 'success', red: 'error', gray: 'neutral' } as const

export interface OrderDetailsData {
  id: string; location: string; status: string; statusVariant: OrderTableRow['statusVariant']
  timelineStatus: string; timelineTime: string; timelineMessage: string
  requestedDelivery: string; requirement: string; quantity: string; totalWeight: string
  totalVolume: string; receivingWindow: string; arrivalTime: string; notes: string
}
interface OrderDetailsPanelProps {
  data: OrderDetailsData | null
  onCancel?: () => void
  cancelling?: boolean
  cancelError?: string
  onViewFull?: () => void
  full?: boolean
}
export function OrderDetailsPanel({ data, onCancel, cancelling = false, cancelError = '', onViewFull, full = false }: OrderDetailsPanelProps) {
  if (!data) return <aside className="store-order-details store-order-details-empty type-text-sm-regular">Select an order to see its details.</aside>
  const problem = data.statusVariant === 'red'
  const fields = [
    ['Requested delivery', data.requestedDelivery], ['Requirement', data.requirement],
    ['Quantity', data.quantity], ['Total weight', data.totalWeight], ['Total volume', data.totalVolume],
  ]
  return <aside className={`store-order-details ${full ? 'store-order-details--full' : ''}`} aria-label={`Details for ${data.id}`}>
    <header className="store-order-detail-header"><div><h2 className="type-display-md-medium">{data.id}</h2><p className="type-text-sm-regular">{data.location}</p></div><StatusBadge size="md" tone={orderStatusTones[data.statusVariant]} leadingIcon={<ScheduleRounded />}>{data.status}</StatusBadge></header>
    <section className="store-order-received">
      <div><span className={`store-order-received-icon ${problem ? 'store-order-received-icon--error' : ''}`}>{problem ? <ErrorOutlineRounded aria-hidden="true" /> : <CheckRounded aria-hidden="true" />}</span><div><h3 className="type-text-md-semibold">{data.timelineStatus}</h3><p className="type-text-sm-regular">{data.timelineTime}</p></div></div>
      <p className="type-text-sm-regular">{data.timelineMessage}</p>
    </section>
    <section className="store-order-detail-section"><h3 className="type-text-md-semibold">Order details</h3>
      <dl>{fields.map(([label, value]) => <div key={label}><dt className="type-text-sm-regular">{label}</dt><dd className="type-text-sm-semibold">{label === 'Requirement' && (value === 'Chilled' ? <AcUnitRounded aria-hidden="true" /> : <ViewInArOutlined aria-hidden="true" />)}{value}</dd></div>)}</dl>
    </section>
    <section className="store-order-detail-section"><h3 className="type-text-md-semibold">Delivery</h3><dl>
      <div><dt className="type-text-sm-regular">Receiving window</dt><dd className="type-text-sm-semibold">{data.receivingWindow}</dd></div>
      <div><dt className="type-text-sm-regular">Arrival time</dt><dd className="type-text-sm-semibold">{data.arrivalTime}</dd></div>
      {full && <div><dt className="type-text-sm-regular">Delivery notes</dt><dd className="type-text-sm-regular">{data.notes || 'No additional notes'}</dd></div>}
    </dl></section>
    <div className="store-order-detail-actions">
      {onViewFull && <Button size="md" trailingIcon={<ArrowForwardRounded />} onClick={onViewFull}>View full order</Button>}
      {cancelError && <p role="alert" className="store-orders-error type-text-sm-regular">{cancelError}</p>}
      {onCancel && <Button size="sm" loading={cancelling} loadingLabel="Cancelling…" onClick={onCancel}>Cancel order</Button>}
    </div>
  </aside>
}
