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
import { DetailPanel } from '@/components/ui/detail-panel'
import type { DetailPanelState } from '@/components/ui/use-detail-panel'
import { VehicleOption } from './vehicle-option'
import { formatDay } from '../api'
import { allocationNotices, allocationOptions, allocationPredictionPreview, optionBlocker, type ConfirmedOrder } from '../data'

export function AllocationPanel({
  panel,
  order,
  optionId,
  onSelectOption,
  onAssign,
  onClose,
  onDefer,
}: {
  panel: DetailPanelState
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
    <DetailPanel panel={panel} label={`Allocation review for ${order.id}`} className="order-allocation-panel">
      <header className="order-allocation-heading">
        <h2 id="order-allocation-title" className="type-display-md-medium">
          Allocation Review
        </h2>
        {/* The pop-up has its own close button in the panel toolbar. */}
        {panel.mode === 'side' && (
          <button className="order-panel-close" onClick={onClose} aria-label="Close allocation review">
            <CloseRounded fontSize="inherit" />
          </button>
        )}
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
          <p className="type-text-xs-regular text-wp-text-tertiary">
            {order.outlet} · Requested for {order.requestedDelivery}
            {order.carriedOver && ' · carried over from that run'}
          </p>
          {order.notes && <p className="type-text-sm-regular text-wp-text-secondary">Store note: {order.notes}</p>}
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
              <p className="type-text-sm-regular text-wp-text-secondary">Vehicle options arrive with the planning step. You can defer this order now.</p>
            )}
          </>
        ) : order.status === 'Deferred' ? (
          <section className="order-deferral" aria-labelledby="order-deferral-title">
            <header>
              <span className="order-deferral-icon">
                <CalendarMonthOutlined fontSize="inherit" />
              </span>
              <div>
                <h3 id="order-deferral-title" className="type-text-md-semibold">
                  Order deferred
                </h3>
                <p className="type-text-xs-regular text-wp-text-tertiary">Left off its run and moved to a later one.</p>
              </div>
            </header>
            <div className="order-deferral-move">
              <div>
                <span className="type-text-xs-regular text-wp-text-tertiary">Requested for</span>
                <strong className="type-text-sm-semibold">{order.requestedDelivery}</strong>
              </div>
              <ArrowForwardRounded fontSize="inherit" />
              <div>
                <span className="type-text-xs-regular text-wp-text-tertiary">Moved to</span>
                <strong className="type-text-sm-semibold">{order.deferral?.deferredTo ? formatDay(order.deferral.deferredTo) : 'Not confirmed yet'}</strong>
              </div>
            </div>
            <dl className="order-deferral-rows type-text-sm-regular">
              <div>
                <dt className="text-wp-text-tertiary">Reason</dt>
                <dd className="type-text-sm-medium">{order.deferral?.reason ?? 'Not recorded'}</dd>
              </div>
              {order.deferral?.details && (
                <div>
                  <dt className="text-wp-text-tertiary">Note</dt>
                  <dd>{order.deferral.details}</dd>
                </div>
              )}
            </dl>
          </section>
        ) : (
          <div className="order-assignment-summary">
            <CheckCircleRounded fontSize="inherit" />
            <div>
              <h3 className="type-text-md-semibold">Order {order.status.toLowerCase()}</h3>
              <p className="type-text-sm-regular text-wp-text-secondary">
                {order.assignedVehicle ? `${order.assignedVehicle} · ${order.assignedTrip}` : order.status === 'Allocated' ? 'Assigned to a trip in Planning.' : ''}
              </p>
            </div>
          </div>
        )}
        <section className="order-prediction-preview" aria-label="Allocation suggestion and prediction preview">
          <h3 className="type-text-md-semibold">Suggested: {allocationPredictionPreview.vehicleId} · {allocationPredictionPreview.trip}</h3>
          <p className="type-text-sm-regular">Handling est. {allocationPredictionPreview.handlingMinutes} min · Late-arrival risk {allocationPredictionPreview.lateArrivalRiskPercent}%</p>
          <p className="type-text-sm-regular">Example suggestion: fits capacity, temperature and outlet access. Confirm assignment after reviewing the plan.</p>
          <p className="type-text-sm-regular">Prediction preview · Example values</p>
        </section>
      </div>
      {order.status === 'Unallocated' && (
        <footer className="fleet-details-footer order-allocation-actions">
          {/* An order already carried over from an earlier run is re-deferred by the planning run, not here. */}
          <Button id={`defer-order-${order.id}`} onClick={onDefer} disabled={order.carriedOver}>
            Defer order
          </Button>
          <Button variant="primary" disabled={!canAssign} onClick={onAssign}>
            {selected ? `Assign to ${selected.vehicleId}` : 'Select a vehicle'}
            <ArrowForwardRounded fontSize="inherit" />
          </Button>
        </footer>
      )}
    </DetailPanel>
  )
}
