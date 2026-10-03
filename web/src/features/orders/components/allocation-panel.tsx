import CloseRounded from '@mui/icons-material/CloseRounded'
import AcUnitRounded from '@mui/icons-material/AcUnitRounded'
import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined'
import ScaleOutlined from '@mui/icons-material/ScaleOutlined'
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined'
import RefreshRounded from '@mui/icons-material/RefreshRounded'
import WarningRounded from '@mui/icons-material/WarningRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import { Button } from '@/components/ui/button'
import { VehicleOption } from './vehicle-option'
import { allocationNotices, allocationOptions, optionBlocker, type ConfirmedOrder } from '../data'

export function AllocationPanel({
  order,
  optionId,
  onSelectOption,
  onAssign,
  onClose,
  onDefer,
}: {
  order: ConfirmedOrder
  optionId: string | null
  onSelectOption: (id: string) => void
  onAssign: () => void
  onClose: () => void
  onDefer: () => void
}) {
  const options = allocationOptions.filter((option) => option.orderId === order.id)
  const selected = options.find((option) => option.id === optionId)
  const canAssign = order.status === 'Unallocated' && selected && !optionBlocker(order, selected)
  const notice = allocationNotices[order.id]
  return (
    <aside className="fleet-details order-allocation-panel" aria-labelledby="order-allocation-title">
      <header className="order-allocation-heading">
        <h2 id="order-allocation-title" className="type-display-md-medium">
          Allocation Review
        </h2>
        <button className="order-panel-close" onClick={onClose} aria-label="Close allocation review">
          <CloseRounded fontSize="inherit" />
        </button>
      </header>
      <div className="order-allocation-body">
        <section className={`order-summary ${order.reviewDescription ? 'order-summary--detailed' : ''}`}>
          <div className="order-summary-heading">
            <h3 className="type-text-md-semibold">{order.id}</h3>
            <span className="type-text-xs-regular text-wp-text-tertiary">
              {order.windowStart && order.windowEnd ? `Delivery window · ${order.windowStart}–${order.windowEnd}` : 'Delivery window not supplied'}
            </span>
          </div>
          <p className="type-text-sm-regular text-wp-text-secondary">
            {order.reviewDescription ?? `${order.requirement} - ${order.outlet.replace(/^.* - /, '')}${order.district ? ` · ${order.district} district` : ''}`}
          </p>
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
        {order.status === 'Unallocated' ? (
          <>
            <section>
              {options.length > 0 && (
                <p className="order-options-refresh type-text-xs-regular text-wp-text-tertiary">
                  <RefreshRounded fontSize="inherit" />
                  Options refreshed just now
                </p>
              )}
              {notice && (
                <div className="order-blocker">
                  <WarningRounded fontSize="inherit" />
                  <div>
                    <h3 className="type-text-sm-bold">{notice.title}</h3>
                    <p className="type-text-sm-regular text-wp-text-secondary">{notice.description}</p>
                  </div>
                </div>
              )}
            </section>
            {options.length > 0 ? (
              <fieldset className="order-options">
                <legend className="type-text-md-semibold">Available options</legend>
                {options.map((option) => (
                  <VehicleOption key={option.id} order={order} option={option} selected={optionId === option.id} onSelect={() => onSelectOption(option.id)} />
                ))}
              </fieldset>
            ) : (
              <p className="type-text-sm-regular text-wp-text-secondary">No vehicle options have been supplied for this order.</p>
            )}
          </>
        ) : (
          <div className={`order-assignment-summary ${order.status === 'Deferred' ? 'order-assignment-summary--deferred' : ''}`}>
            {order.status === 'Deferred' ? <CalendarMonthOutlined fontSize="inherit" /> : <CheckCircleRounded fontSize="inherit" />}
            <div>
              <h3 className="type-text-md-semibold">{order.status === 'Allocated' ? 'Order allocated' : 'Order deferred'}</h3>
              <p className="type-text-sm-regular text-wp-text-secondary">
                {order.status === 'Deferred'
                  ? order.deferral?.reason
                  : order.assignedVehicle
                    ? `${order.assignedVehicle} · ${order.assignedTrip}`
                    : 'Assignment details will be added in the next development stage.'}
              </p>
              {order.deferral?.details && <p className="type-text-sm-regular text-wp-text-secondary">{order.deferral.details}</p>}
              {order.status === 'Deferred' && <p className="type-text-xs-regular text-wp-text-tertiary">Revised delivery date not confirmed.</p>}
            </div>
          </div>
        )}
      </div>
      {order.status === 'Unallocated' && (
        <footer className="fleet-details-footer order-allocation-actions">
          <Button id={`defer-order-${order.id}`} onClick={onDefer}>
            Defer order
          </Button>
          <Button variant="primary" disabled={!canAssign} onClick={onAssign}>
            {selected ? `Assign to ${selected.vehicleId}` : 'Select a vehicle'}
            <ArrowForwardRounded fontSize="inherit" />
          </Button>
        </footer>
      )}
    </aside>
  )
}
