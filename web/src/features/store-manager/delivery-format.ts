import type { DeliveryTracking, StoreOrder } from './api'
import { capitalise, formatDay, formatTime, outletLabel, statusOf } from './order-format'
import type { DeliveryDetails, DeliveryDetailsData, DeliveryHistoryItem, DeliveryTimelineStep, TimelineStep } from './types'

type Trip = NonNullable<DeliveryTracking['trip']>
type Stop = NonNullable<DeliveryTracking['stop']>

// The banner sits on yellow, so a neutral status keeps the amber pill.
const bannerVariants = { green: 'green', yellow: 'yellow', red: 'red', gray: 'yellow' } as const

const cases = (units: number) => `${units} ${units === 1 ? 'case' : 'cases'}`

const positionOf = (point: { lat: number | null; lng: number | null } | null): [number, number] | null => (point?.lat != null && point.lng != null ? [point.lat, point.lng] : null)

/** The vehicle has reached the outlet, whatever came of the drop. */
const reached = (stop: Stop) => stop.actualArrivalAt !== null || stop.status === 'arrived' || stop.status === 'delivered' || stop.status === 'partial' || stop.status === 'failed'

/** The vehicle is out on the road and has not reached this outlet yet. */
export const isEnRoute = (trip: Trip, stop: Stop) => trip.status === 'dispatched' && !reached(stop)

function timeline(trip: Trip, stop: Stop): TimelineStep[] {
  const loaded = trip.status === 'loaded' || trip.status === 'dispatched' || trip.status === 'completed' || stop.status !== 'pending'
  const departed = trip.actualDepartAt !== null || trip.status === 'dispatched' || trip.status === 'completed'
  const handedOver = stop.status === 'delivered' || stop.status === 'partial'
  const failed = stop.status === 'failed'

  const steps: { title: string; timestamp: string; done: boolean }[] = [
    { title: 'Plan confirmed', timestamp: `Trip ${trip.tripNo} · ${formatDay(trip.serviceDate)}`, done: true },
    {
      title: `Loaded at ${trip.depot.name}`,
      timestamp: loaded ? 'Loaded' : trip.status === 'loading' ? 'Loading now' : `Departs ${formatTime(trip.plannedDepartAt)}`,
      done: loaded,
    },
    { title: 'On the way', timestamp: trip.actualDepartAt ? `Departed ${formatTime(trip.actualDepartAt)}` : 'Pending', done: departed && reached(stop) },
    {
      title: failed ? 'Not delivered' : 'Arrival at your outlet',
      timestamp: failed
        ? (stop.failureReason ?? 'The delivery could not be completed')
        : stop.actualArrivalAt
          ? `Arrived ${formatTime(stop.actualArrivalAt)}`
          : `Planned ${formatTime(stop.plannedArrivalAt)}`,
      done: stop.actualArrivalAt !== null && !failed,
    },
    {
      title: 'Receipt confirmation',
      timestamp: stop.receiptConfirmedAt
        ? `Confirmed ${formatTime(stop.receiptConfirmedAt)}`
        : handedOver
          ? `Awaiting your confirmation · ${cases(stop.deliveredUnits ?? 0)} handed over`
          : failed
            ? 'Not applicable'
            : 'Available after delivery',
      done: stop.receiptConfirmedAt !== null,
    },
  ]
  // The first step not yet done is the one in progress.
  const current = steps.findIndex((step) => !step.done)
  return steps.map((step, index) => ({ id: index + 1, title: step.title, timestamp: step.timestamp, status: step.done ? 'completed' : index === current ? 'current' : 'pending' }))
}

export function toDeliveryDetails({ order, trip, stop, route }: DeliveryTracking): DeliveryDetails | null {
  if (!trip || !stop) return null
  const status = statusOf(order.status)
  const outletPosition = positionOf(order.outlet)
  const depotPosition = positionOf(trip.depot)
  return {
    vehicleId: trip.vehicle.uniqueId,
    vehicleType: trip.vehicle.isRefrigerated ? `Refrigerated ${trip.vehicle.type}` : capitalise(trip.vehicle.type),
    status: status.label,
    statusVariant: bannerVariants[status.variant],
    quantity: stop.deliveredUnits !== null ? `${stop.deliveredUnits} of ${cases(order.orderUnits)}` : cases(order.orderUnits),
    timeline: timeline(trip, stop),
    depot: { name: trip.depot.name, position: depotPosition },
    outletPosition,
    // Live while it is out; at the outlet once it got there; at the depot before it leaves.
    vehiclePosition: trip.vehicle.location ? positionOf(trip.vehicle.location) : reached(stop) ? outletPosition : trip.status === 'dispatched' ? null : depotPosition,
    route: route.path,
  }
}

type Assignment = NonNullable<StoreOrder['assignment']>

/** A timestamp as e.g. "28 Sep · 05:50" in Waypoint's own time zone. */
const dayAndTime = (value: string) => `${new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Colombo' })} · ${formatTime(value)}`

/** Handed over by the driver, but the store has not confirmed what arrived. */
export const awaitsReceipt = ({ assignment }: StoreOrder) => !!assignment && (assignment.stopStatus === 'delivered' || assignment.stopStatus === 'partial') && !assignment.receiptConfirmedAt

/** The issues API takes a store manager's report once the goods have reached the outlet. */
export const canReportIssue = (order: StoreOrder) => order.status === 'docked' || order.status === 'delivered' || order.status === 'failed'

function deliveryStatus(order: StoreOrder, assignment: Assignment): Pick<DeliveryHistoryItem, 'status' | 'statusVariant'> {
  if (assignment.receiptConfirmedAt) return { status: 'Receipt confirmed', statusVariant: 'green' }
  if (awaitsReceipt(order)) return { status: 'Awaiting confirmation', statusVariant: 'yellow' }
  const { label, variant } = statusOf(order.status)
  return { status: label, statusVariant: variant === 'gray' ? 'default' : variant }
}

function latestUpdate(assignment: Assignment): string {
  if (assignment.receiptConfirmedAt) return `Receipt confirmed · ${formatTime(assignment.receiptConfirmedAt)}`
  if (assignment.stopStatus === 'failed') return 'Not delivered'
  if (assignment.completedAt) return `Driver recorded delivery · ${formatTime(assignment.completedAt)}`
  if (assignment.actualArrivalAt) return `Arrived · ${formatTime(assignment.actualArrivalAt)}`
  return `Planned arrival · ${formatTime(assignment.plannedArrivalAt)}`
}

/** A row of the delivery history; the order must be on a trip. */
export function toHistoryItem(order: StoreOrder): DeliveryHistoryItem {
  const assignment = order.assignment!
  return {
    id: order.reference,
    requirement: order.tempRequirement === 'chilled' ? 'Chilled' : 'Ambient',
    deliveryDate: formatDay(assignment.serviceDate, true),
    latestUpdate: latestUpdate(assignment),
    ...deliveryStatus(order, assignment),
  }
}

function historyTimeline(order: StoreOrder, assignment: Assignment): DeliveryTimelineStep[] {
  const failed = assignment.stopStatus === 'failed'
  const steps: { title: string; timestamp: string; done: boolean }[] = [
    { title: 'Scheduled', timestamp: `Trip ${assignment.tripNo} · ${formatDay(assignment.serviceDate)}`, done: true },
    { title: 'Departed depot', timestamp: assignment.actualDepartAt ? dayAndTime(assignment.actualDepartAt) : 'Pending', done: !!assignment.actualDepartAt },
    failed
      ? { title: 'Not delivered', timestamp: assignment.failureReason ?? 'The delivery could not be completed', done: true }
      : {
          title: 'Driver recorded delivery',
          timestamp: assignment.completedAt ? `${dayAndTime(assignment.completedAt)} · ${cases(assignment.deliveredUnits ?? 0)}` : `Planned arrival ${formatTime(assignment.plannedArrivalAt)}`,
          done: !!assignment.completedAt,
        },
  ]
  if (!failed) {
    steps.push(
      assignment.receiptConfirmedAt
        ? { title: 'Receipt confirmed', timestamp: `${dayAndTime(assignment.receiptConfirmedAt)} · ${cases(assignment.receivedUnits ?? 0)} accepted`, done: true }
        : { title: 'Outlet confirmation pending', timestamp: awaitsReceipt(order) ? 'Check quantities before confirming' : 'Pending', done: false },
    )
  }
  // The first step not yet done is the one in progress.
  const current = steps.findIndex((step) => !step.done)
  return steps.map((step, index) => ({ id: index + 1, title: step.title, timestamp: step.timestamp, status: step.done ? 'completed' : index === current ? 'current' : 'pending' }))
}

/** The details panel for a delivery; the order must be on a trip. */
export function toDeliveryPanel(order: StoreOrder): DeliveryDetailsData {
  const assignment = order.assignment!
  return {
    ...toHistoryItem(order),
    deliveryDate: formatDay(assignment.serviceDate),
    subtitle: `${capitalise(order.tempRequirement)} delivery${order.outlet ? ` · ${outletLabel(order.outlet)}` : ''}`,
    vehicle: `${assignment.vehicle} · ${capitalise(assignment.vehicleType)}`,
    orderedQuantity: cases(order.orderUnits),
    deliveredUnits: assignment.deliveredUnits,
    driverRecorded: assignment.deliveredUnits !== null ? `${cases(assignment.deliveredUnits)} delivered` : assignment.stopStatus === 'failed' ? 'Not delivered' : 'Pending',
    timeline: historyTimeline(order, assignment),
  }
}
