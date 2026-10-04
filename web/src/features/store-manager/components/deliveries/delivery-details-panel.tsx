import { useState } from 'react'
import CheckRounded from '@mui/icons-material/CheckRounded'
import { Button } from '@/components/ui/button'
import { StatusBadge, type StatusBadgeProps } from '@/components/ui/status-badge'
import type { DeliveryDetailsData } from '@/features/store-manager/types'

interface DeliveryDetailsPanelProps {
  data: DeliveryDetailsData | null
  onConfirmReceipt?: () => void
  onReportIssue?: () => void
  confirming?: boolean
  error?: string
  message?: string
}
const tones: Record<DeliveryDetailsData['statusVariant'], StatusBadgeProps['tone']> = {
  yellow: 'warning', green: 'success', red: 'error', blue: 'info', default: 'neutral',
}

export function DeliveryDetailsPanel({ data, onConfirmReceipt, onReportIssue, confirming = false, error = '', message = '' }: DeliveryDetailsPanelProps) {
  const [isReviewing, setIsReviewing] = useState(false)
  if (!data) return <aside id="store-delivery-details" className="store-delivery-details-panel store-delivery-details-empty type-text-sm-regular" aria-label="Delivery details">Select a delivery to see its details.</aside>
  const confirm = () => {
    if (!isReviewing) setIsReviewing(true)
    else { onConfirmReceipt?.(); setIsReviewing(false) }
  }
  const fields = [
    ['Delivery date', data.deliveryDate], ['Vehicle', data.vehicle],
    ['Ordered quantity', data.orderedQuantity], ['Driver recorded', data.driverRecorded],
  ]
  return (
    <aside id="store-delivery-details" className="store-delivery-details-panel" aria-label={`Delivery details for ${data.id}`}>
      <header className="store-delivery-details-heading">
        <div><h2 className="type-display-xs-medium">{data.id}</h2><p className="type-text-sm-regular">{data.subtitle}</p></div>
        <StatusBadge tone={tones[data.statusVariant]}>{data.status}</StatusBadge>
      </header>
      <section className="store-delivery-detail-section">
        <h3 className="type-text-sm-semibold">Delivery details</h3>
        <dl className="store-delivery-detail-fields">
          {fields.map(([label, value]) => <div key={label}><dt className="type-text-sm-medium">{label}</dt><dd className="type-text-xs-regular">{value}</dd></div>)}
        </dl>
      </section>
      <section className="store-delivery-detail-section">
        <h3 className="type-text-sm-semibold">Delivery timeline</h3>
        <ol className="store-delivery-timeline">
          {data.timeline.map((step, index) => <li key={step.id} className={`store-delivery-step store-delivery-step--${step.status}`} aria-current={step.status === 'current' ? 'step' : undefined}>
            <span className="store-delivery-step-icon type-text-sm-semibold" aria-hidden="true">{step.status === 'completed' ? <CheckRounded /> : index + 1}</span>
            <div><p className="type-text-sm-medium">{step.title}<span className="sr-only"> · {step.status}</span></p><p className="type-text-xs-regular">{step.timestamp}</p></div>
          </li>)}
        </ol>
      </section>
      {(onConfirmReceipt || onReportIssue || error || message) && <div className="store-delivery-detail-actions">
        {message && <p role="status" className="store-delivery-action-success type-text-sm-medium">{message}</p>}
        {error && <p role="alert" className="store-delivery-action-error type-text-sm-medium">{error}</p>}
        {onConfirmReceipt && <Button variant="primary" size="md" onClick={confirm} loading={confirming} loadingLabel="Confirming…">
          {isReviewing ? `Confirm ${data.deliveredUnits ?? 0} ${data.deliveredUnits === 1 ? 'case' : 'cases'} received` : 'Review & confirm receipt'}
        </Button>}
        {isReviewing ? <Button size="md" disabled={confirming} onClick={() => setIsReviewing(false)}>Cancel</Button> : onReportIssue && <Button size="md" onClick={onReportIssue}>Report an issue</Button>}
      </div>}
    </aside>
  )
}
