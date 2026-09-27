/**
 * Canonical permission-string catalog for the whole API.
 * Each `<MODULE>.<ACTION>` value here must have a matching row seeded into
 * the `permissions` table by the SeedPermissionsCatalog migration, so that
 * PermissionsGuard checks against something real instead of silently failing
 * closed for every caller that is not a dispatcher.
 *
 * Domain permissions (orders, planning, vehicles, deliveries, issues) get
 * added here as those modules land.
 */
export const PERMISSIONS = {
  DASHBOARD: {
    VIEW: 'dashboard.view',
  },
  USERS: {
    MANAGE: 'user.manage',
  },
  PERMISSIONS: {
    MANAGE: 'permission.manage',
  },
  SETTINGS: {
    MANAGE: 'settings.manage',
  },
};

/** Flat list of every permission string above, for seeding. */
export function flattenPermissions(): string[] {
  const values: string[] = [];
  for (const group of Object.values(PERMISSIONS)) {
    for (const value of Object.values(group)) {
      values.push(value);
    }
  }
  return Array.from(new Set(values));
}
