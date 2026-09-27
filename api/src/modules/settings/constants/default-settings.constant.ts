/**
 * Seeded once by the SeedDefaultSettings migration. These are the operational
 * knobs the planning workflow reads at runtime — an operator changes them
 * through the settings endpoints, not through a deploy.
 *
 * Keep secrets and connection details out of here; those stay in env and are
 * read via ConfigService.
 */
export interface DefaultSetting {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'time' | 'json';
  description: string;
}

export const DEFAULT_SETTINGS: DefaultSetting[] = [
  {
    key: 'order_cutoff_time',
    value: '16:00',
    type: 'time',
    description:
      'Daily cutoff after which new orders roll to the next operating day.',
  },
  {
    key: 'loading_deadline_time',
    value: '05:30',
    type: 'time',
    description:
      'A returning vehicle checked in after this time cannot be loaded for the day.',
  },
  {
    key: 'max_trips_per_vehicle',
    value: '2',
    type: 'number',
    description:
      'Maximum trips the allocation engine may assign to one vehicle per day.',
  },
  {
    key: 'auto_accept_orders',
    value: 'false',
    type: 'boolean',
    description:
      'When true, confirmed orders enter the demand queue without dispatcher review.',
  },
  {
    key: 'driver_rest_minutes',
    value: '45',
    type: 'number',
    description: 'Rest time reserved between a driver’s consecutive trips.',
  },
];
