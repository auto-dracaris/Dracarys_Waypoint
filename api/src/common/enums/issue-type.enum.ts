/** Loader, driver and store-manager reports share one `issues` table. */
export enum IssueType {
  LOAD_SHORTFALL = 'load_shortfall',
  LOAD_DAMAGE = 'load_damage',
  VEHICLE_BREAKDOWN = 'vehicle_breakdown',
  DELAY = 'delay',
  DELIVERY_PROBLEM = 'delivery_problem',
  // What the driver's issue form offers at a stop.
  DAMAGED = 'damaged',
  TEMPERATURE_BREACH = 'temperature_breach',
  SHORT_DELIVERY = 'short_delivery',
  WRONG_ITEMS = 'wrong_items',
  RECEIPT_SHORTFALL = 'receipt_shortfall',
  RECEIPT_DAMAGE = 'receipt_damage',
  OTHER = 'other',
}
