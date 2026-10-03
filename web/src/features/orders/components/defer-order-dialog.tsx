import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useEffect, useRef, useState } from 'react'
import CloseRounded from '@mui/icons-material/CloseRounded'
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined'
import AcUnitRounded from '@mui/icons-material/AcUnitRounded'
import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined'
import ScaleOutlined from '@mui/icons-material/ScaleOutlined'
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined'
import WarningRounded from '@mui/icons-material/WarningRounded'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import { Button } from '@/components/ui/button'
import { allocationNotices, deferralReason, type ConfirmedOrder } from '../data'

export function DeferOrderDialog({ order, error, onClose, onConfirm }: { order: ConfirmedOrder; error: string; onClose: () => void; onConfirm: (reason: string, details: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [reason, setReason] = useState(deferralReason)
  const [details, setDetails] = useState(order.id === 'DEMO-108' ? 'All compatible refrigerated vans are fully allocated.' : '')
  const notice = allocationNotices[order.id]
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => {
      element.close()
      // Confirmation removes the Defer button; return to the selected row then.
      requestAnimationFrame(() => (document.getElementById(`defer-order-${order.id}`) ?? document.getElementById(`order-select-${order.id}`))?.focus())
    }
  }, [order.id])
  return (
    <dialog
      ref={dialog}
      className="stage-notice order-defer-dialog"
      aria-labelledby="defer-order-title"
      aria-describedby="defer-order-description"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') event.stopPropagation()
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onConfirm(reason, details)
        }}
      >
        <header className="order-defer-header">
          <CalendarMonthOutlined className="order-defer-icon" fontSize="inherit" />
          <div>
            <h2 id="defer-order-title" className="type-text-xl-medium">
              Defer order {order.id}?
            </h2>
            <p id="defer-order-description" className="type-text-xs-regular text-wp-text-secondary">
              Remove this order from the current delivery plan. It will remain pending for a future eligible run.
            </p>
          </div>
          <button type="button" className="order-panel-close" onClick={onClose} aria-label="Close deferral dialog">
            <CloseRounded fontSize="inherit" />
          </button>
        </header>
        <div className="order-defer-body">
          <section className="order-defer-summary" aria-label="Order to defer">
            <h3 className="type-text-lg-medium">{order.outlet}</h3>
            <p className="type-text-xs-regular text-wp-text-tertiary">Requested delivery · {order.requestedDelivery ?? 'Not supplied'}</p>
            <div className="order-detail-tags">
              <span className="order-detail-tag order-detail-tag--cargo type-text-xs-medium">
                <AcUnitRounded fontSize="inherit" />
                {order.requirement}
              </span>
              {order.vanOnly && (
                <span className="order-detail-tag type-text-xs-medium">
                  <LocalShippingOutlined fontSize="inherit" />
                  Van only
                </span>
              )}
              <span className="order-detail-tag type-text-xs-medium">
                <ScaleOutlined fontSize="inherit" />
                {order.weight} kg
              </span>
              <span className="order-detail-tag type-text-xs-medium">
                <Inventory2Outlined fontSize="inherit" />
                {order.volume} m³
              </span>
            </div>
          </section>
          {notice && (
            <section className="order-blocker">
              <WarningRounded fontSize="inherit" />
              <div>
                <h3 className="type-text-sm-bold">{notice.title}</h3>
                <p className="type-text-sm-regular text-wp-text-secondary">{notice.description}</p>
              </div>
            </section>
          )}
          <div className="order-defer-fields">
            <label className="type-text-sm-medium" htmlFor="deferral-reason">
              Reason{' '}
              <span className="text-wp-text-error-primary" aria-hidden="true">
                *
              </span>
            </label>
            <Select id="deferral-reason" value={reason} required onChange={(event) => setReason(event.target.value)}>
              <option value="">Select a reason</option>
              <option value={deferralReason}>{deferralReason}</option>
            </Select>
            <label className="type-text-sm-medium" htmlFor="deferral-details">
              Additional details
            </label>
            <Textarea id="deferral-details" value={details} onChange={(event) => setDetails(event.target.value)} />
          </div>
          <section className="order-defer-expectation" aria-labelledby="deferral-expectation">
            <h3 id="deferral-expectation" className="type-text-xs-semibold text-wp-text-tertiary">
              Delivery expectation
            </h3>
            <p className="type-text-sm-medium">Revised delivery date not confirmed.</p>
            <p className="type-text-xs-regular text-wp-text-tertiary">Reconsider during the next eligible planning cycle.</p>
          </section>
          <section className="order-defer-preview" aria-labelledby="deferral-preview">
            <h3 id="deferral-preview" className="type-text-xs-semibold">
              Store update preview
            </h3>
            <div>
              <DescriptionOutlined fontSize="inherit" />
              <div className="type-text-xs-regular">
                <p>Your delivery has been deferred because suitable vehicle capacity is unavailable.</p>
                <p>A revised delivery date is not yet confirmed.</p>
              </div>
            </div>
          </section>
          {error && (
            <p role="alert" className="order-error type-text-sm-medium">
              {error}
            </p>
          )}
        </div>
        <footer className="order-defer-footer">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            Confirm deferral
          </Button>
        </footer>
      </form>
    </dialog>
  )
}
