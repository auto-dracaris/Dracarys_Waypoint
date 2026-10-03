import { apiRequest } from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/api-endpoints'
import { deferralReasons, type DeferralReason } from '@/features/orders/data'
import type { DeliveryPlan, PlanRoute, PlanState } from './data'

interface ApiPlanOrder {
  reference: string
  outlet: { uniqueId: string; name: string | null }
  orderWeightKg: number
  orderVolumeM3: number
  windowOpen: string
  windowClose: string
}

interface ApiPlan {
  date: string
  depot: string
  state: PlanState
  awaiting: number
  totals: DeliveryPlan['totals']
  trips: {
    tripNo: number
    brand: string
    district: string | null
    vehicle: { uniqueId: string; type: 'truck' | 'van'; isRefrigerated: boolean }
    plannedDepartAt: string
    plannedMinutes: number
    plannedKm: number
    totalWeightKg: number
    totalVolumeM3: number
    stops: (ApiPlanOrder & { seq: number; plannedArrivalAt: string; plannedWaitMin: number })[]
  }[]
  deferred: (ApiPlanOrder & { reason: DeferralReason; note: string | null; score: number; timesDeferred: number })[]
  issues: { message: string }[]
}

/** A timestamp as the time of day at the depot, e.g. "05:13". */
const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo' })
const outletName = (outlet: ApiPlanOrder['outlet']) => (outlet.name ? `${outlet.uniqueId} · ${outlet.name}` : outlet.uniqueId)

function toRoute(trip: ApiPlan['trips'][number]): PlanRoute {
  const { vehicle } = trip
  return {
    vehicleId: vehicle.uniqueId,
    vehicleType: vehicle.isRefrigerated ? `Refrigerated ${vehicle.type}` : `${vehicle.type[0].toUpperCase()}${vehicle.type.slice(1)}`,
    trip: `Trip ${trip.tripNo}`,
    summary: `${trip.brand} · ${trip.district ?? 'Unknown district'} · departs ${clock(trip.plannedDepartAt)} · ${trip.plannedMinutes} min · ${trip.plannedKm} km · ${trip.totalWeightKg} kg / ${trip.totalVolumeM3} m³`,
    stops: trip.stops.map((stop) => ({
      sequence: stop.seq,
      outlet: outletName(stop.outlet),
      orderId: stop.reference,
      // An early vehicle waits for the outlet's window to open.
      arrival: stop.plannedWaitMin ? `${clock(stop.plannedArrivalAt)} (waits ${stop.plannedWaitMin} min)` : clock(stop.plannedArrivalAt),
      window: `${stop.windowOpen}–${stop.windowClose}`,
      load: `${stop.orderWeightKg} kg / ${stop.orderVolumeM3} m³`,
    })),
  }
}

function toPlan(plan: ApiPlan): DeliveryPlan {
  return {
    date: plan.date,
    depot: plan.depot,
    state: plan.state,
    awaiting: plan.awaiting,
    totals: plan.totals,
    routes: plan.trips.map(toRoute),
    deferred: plan.deferred.map((order) => ({
      id: order.reference,
      outlet: outletName(order.outlet),
      reason: deferralReasons[order.reason],
      note: order.note ?? '',
      score: order.score,
      previousDeferrals: order.timesDeferred,
    })),
    issues: plan.issues.map((issue) => issue.message),
  }
}

/** One depot's plan for one delivery day; `state` is 'none' until planning has been run. */
export async function fetchPlan(token: string, date: string, depot: string): Promise<DeliveryPlan> {
  return toPlan(await apiRequest<ApiPlan>(API_ENDPOINTS.planning.plan, { token, params: { date, depot } }))
}

/** Scores and allocates the orders awaiting that run and saves the result as a draft, replacing any earlier draft. */
export async function runPlanning(token: string, date: string, depot: string): Promise<DeliveryPlan> {
  return toPlan(await apiRequest<ApiPlan>(API_ENDPOINTS.planning.run, { method: 'POST', token, body: { date, depot } }))
}

/** Accepts the draft: its trips reach the loader and driver, and the orders it leaves off are deferred. */
export async function publishPlan(token: string, date: string, depot: string): Promise<DeliveryPlan> {
  return toPlan(await apiRequest<ApiPlan>(API_ENDPOINTS.planning.publish, { method: 'POST', token, body: { date, depot } }))
}
