/** DRAFT is a planner proposal; PLANNED is what the loader and driver see. */
export enum TripStatus {
  DRAFT = 'draft',
  PLANNED = 'planned',
  LOADING = 'loading',
  LOADED = 'loaded',
  DISPATCHED = 'dispatched',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}
