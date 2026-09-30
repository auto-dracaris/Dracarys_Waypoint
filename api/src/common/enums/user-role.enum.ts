/**
 * The swimlanes of the Waypoint workflow. There is no `roles` table — this enum
 * is the only source of truth, stored directly on `users.role`.
 *
 * Access control is role-based: each protected route lists the roles allowed
 * to call it with `@Roles(...)`, enforced by `RolesGuard`. DISPATCHER is the
 * privileged operator (admin): they confirm fleet status, publish plans,
 * resolve exceptions and run the user/vehicle/stall managers.
 */
export enum UserRole {
  DISPATCHER = 'dispatcher',
  STORE_MANAGER = 'store_manager',
  DRIVER = 'driver',
  LOADER = 'loader',
}
