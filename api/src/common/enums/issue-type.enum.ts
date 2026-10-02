/** Loader, driver and store-manager reports share one `issues` table. */
export enum IssueType {
  LOAD_SHORTFALL = 'load_shortfall',
  LOAD_DAMAGE = 'load_damage',
  VEHICLE_BREAKDOWN = 'vehicle_breakdown',
  DELAY = 'delay',
  DELIVERY_PROBLEM = 'delivery_problem',
  RECEIPT_SHORTFALL = 'receipt_shortfall',
  RECEIPT_DAMAGE = 'receipt_damage',
  OTHER = 'other',
}
