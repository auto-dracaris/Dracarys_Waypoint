/** Why an order moved to the next run. Free text goes in `reason_note`. */
export enum DeferralReason {
  VEHICLE_CAPACITY = 'vehicle_capacity',
  REFRIGERATED_CAPACITY = 'refrigerated_capacity',
  VAN_ACCESS = 'van_access',
  FUEL_QUOTA = 'fuel_quota',
  TIME_BUDGET = 'time_budget',
  VEHICLE_UNAVAILABLE = 'vehicle_unavailable',
  STORE_REQUESTED = 'store_requested',
  OTHER = 'other',
}
