/**
 * Lifecycle of an order from the store manager's request to the outlet's
 * receipt. DEFERRED orders re-enter planning on the next run.
 */
export enum OrderStatus {
  ORDERED = 'ordered',
  CONFIRMED = 'confirmed',
  PLANNED = 'planned',
  DEFERRED = 'deferred',
  LOADED = 'loaded',
  DISPATCHED = 'dispatched',
  IN_TRANSIT = 'in_transit',
  DOCKED = 'docked',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}
