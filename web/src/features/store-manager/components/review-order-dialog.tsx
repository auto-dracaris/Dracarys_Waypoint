import { useRef } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/shadcn/dialog'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import ViewInArOutlined from '@mui/icons-material/ViewInArOutlined'
import AcUnitRounded from '@mui/icons-material/AcUnitRounded'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import type { PlaceOrderFormValues } from '@/features/store-manager/types'
import type { StoreOutlet } from '@/features/store-manager/api'
import { formatDay, outletLabel, windowLabel } from '@/features/store-manager/order-format'
interface ReviewOrderDialogProps {
  open: boolean; onOpenChange: (open: boolean) => void; data: PlaceOrderFormValues | null
  outlet: StoreOutlet; onConfirm: () => void; submitting: boolean; error: string
}
export function ReviewOrderDialog({ open, onOpenChange, data, outlet, onConfirm, submitting, error }: ReviewOrderDialogProps) {
  const title = useRef<HTMLHeadingElement>(null)
  if (!data) return null
  const rows = [['Outlet', outletLabel(outlet)], ['Serving depot', outlet.depot ?? '—'], ['Requested delivery date', formatDay(data.deliveryDate, true)], ['Receiving window', windowLabel(outlet)]]
  return <Dialog open={open} onOpenChange={(value) => { if (!submitting) onOpenChange(value) }}>
    <DialogContent className="store-review-dialog" initialFocus={title} showCloseButton={!submitting}>
      <DialogTitle ref={title} tabIndex={-1} className="type-display-xs-medium">Review your order</DialogTitle>
      <section className="store-review-section"><h3 className="type-text-md-semibold">Order information</h3><dl className="store-review-information">{rows.map(([label, value]) => <div key={label}><dt className="type-text-sm-medium">{label}</dt><dd className="type-text-sm-regular">{value}</dd></div>)}</dl></section>
      <section className="store-review-section"><div className="store-review-heading"><h3 className="type-text-md-semibold">Load summary</h3><StatusBadge tone={data.temperatureMode === 'ambient' ? 'warning' : 'info'} leadingIcon={data.temperatureMode === 'ambient' ? <ViewInArOutlined /> : <AcUnitRounded />}>{data.temperatureMode === 'ambient' ? 'Ambient' : 'Chilled'}</StatusBadge></div>
        <dl className="store-review-metrics">{[['Quantity', `${data.quantity} ${data.quantity === 1 ? 'case' : 'cases'}`], ['Total weight', `${data.weight} kg`], ['Total volume', `${data.volume} m³`]].map(([label, value]) => <div key={label}><dt className="type-text-xs-medium">{label}</dt><dd className="type-text-md-semibold">{value}</dd></div>)}</dl>
        <h4 className="type-text-sm-semibold">Delivery notes</h4><p className="type-text-sm-regular">{data.notes || 'No additional notes'}</p>
      </section>
      <div className="store-review-notice"><InfoOutlined aria-hidden="true" /><div><h3 className="type-text-sm-semibold">What happens after submission?</h3><p className="type-text-sm-regular">Your order is confirmed as soon as it is submitted. Delivery planning starts after the cutoff.</p><p className="type-text-sm-regular">We’ll notify you when delivery is scheduled or explain why the order is deferred.</p></div></div>
      {error && <p role="alert" className="store-place-error type-text-sm-regular">{error}</p>}
      <footer className="store-review-actions"><Button size="md" disabled={submitting} onClick={() => onOpenChange(false)}>Back to edit</Button><Button size="md" variant="primary" loading={submitting} loadingLabel="Submitting…" onClick={onConfirm}>Submit order</Button></footer>
    </DialogContent>
  </Dialog>
}
