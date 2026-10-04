/** What happened. Clients pick the icon and where a tap leads from this. */
export enum NotificationType {
  TRIP_ASSIGNED = 'trip_assigned',
  TRIPS_TO_LOAD = 'trips_to_load',
  TRIP_READY = 'trip_ready',
  ROUTE_CHANGED = 'route_changed',
  ORDER_SCHEDULED = 'order_scheduled',
  ORDER_DEFERRED = 'order_deferred',
  ORDER_OUT_FOR_DELIVERY = 'order_out_for_delivery',
  DELIVERY_RECORDED = 'delivery_recorded',
  DELIVERY_PROBLEM = 'delivery_problem',
  PLAN_DRAFT_READY = 'plan_draft_ready',
  PLAN_RUN_FAILED = 'plan_run_failed',
  ISSUE_REPORTED = 'issue_reported',
  ISSUE_ACKNOWLEDGED = 'issue_acknowledged',
  ISSUE_RESOLVED = 'issue_resolved',
}
