/**
 * The swimlanes of the Waypoint workflow. There is no `roles` table — this enum
 * is the only source of truth, stored directly on `users.role`.
 *
 * DISPATCHER is the privileged operator: they confirm fleet status, publish
 * plans, resolve exceptions and run the settings/user/vehicle/stall managers, so
 * they bypass permission checks entirely. Every other role is a label, and what
 * its holders may do comes from the permission rows granted to each user.
 */
export enum UserRole {
  DISPATCHER = 'dispatcher',
  STORE_MANAGER = 'store_manager',
  DRIVER = 'driver',
  LOADER = 'loader',
}
