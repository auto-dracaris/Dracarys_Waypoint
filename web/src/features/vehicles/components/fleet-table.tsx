import { StatusBadge } from '@/components/ui/status-badge'
import SwapVertRounded from '@mui/icons-material/SwapVertRounded'
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded'
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import { Button } from '@/components/ui/button'
import type { Paginated } from '@/lib/api-client'
import { availabilityTones, type FleetVehicle, type VehicleSort, type VehicleSortKey } from '../data'

const columns: { label: string; key?: VehicleSortKey }[] = [
  { label: 'Vehicle', key: 'id' },
  { label: 'Type', key: 'type' },
  { label: 'Capacity', key: 'weight' },
  { label: 'Fuel' },
  { label: 'Availability', key: 'availability' },
]

export function FleetTable({
  vehicles,
  checked,
  selectedId,
  sort,
  loading,
  error,
  hasVehicles,
  meta,
  onPage,
  onSort,
  onCheck,
  onSelect,
  onClear,
  onRetry,
}: {
  vehicles: FleetVehicle[]
  checked: Set<string>
  selectedId?: string
  sort: VehicleSort
  loading: boolean
  error: string
  hasVehicles: boolean
  meta: Paginated<unknown>['meta'] | null
  onPage: (page: number) => void
  onSort: (key: VehicleSortKey) => void
  onCheck: (id: string) => void
  onSelect: (id: string) => void
  onClear: () => void
  onRetry: () => void
}) {
  const first = meta ? (meta.page - 1) * meta.limit + 1 : 0
  return (
    <>
      <div className="fleet-table-scroll" role="region" aria-label="Vehicle inventory" tabIndex={0}>
        <table className="fleet-table">
          <caption className="sr-only">Vehicle inventory. Select a vehicle to view details; use column headings to sort.</caption>
          <thead>
            <tr>
              {columns.map(({ label, key }) => (
                <th key={label} scope="col" aria-sort={key && sort.key === key ? sort.direction : 'none'}>
                  {key ? (
                    <button className="type-text-sm-medium" onClick={() => onSort(key)}>
                      {label}
                      {sort.key === key ? (
                        sort.direction === 'ascending' ? (
                          <ArrowUpwardRounded fontSize="inherit" />
                        ) : (
                          <ArrowDownwardRounded fontSize="inherit" />
                        )
                      ) : (
                        <SwapVertRounded fontSize="inherit" />
                      )}
                    </button>
                  ) : (
                    <span className="type-text-sm-medium">{label}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className={checked.has(vehicle.id) ? 'fleet-row-checked' : ''} onClick={() => onSelect(vehicle.id)}>
                <td>
                  <div className="fleet-id-cell">
                    <span className="fleet-checkbox">
                      <input type="checkbox" aria-label={`Select ${vehicle.id}`} checked={checked.has(vehicle.id)} onClick={(event) => event.stopPropagation()} onChange={() => onCheck(vehicle.id)} />
                      {checked.has(vehicle.id) && <CheckRounded fontSize="inherit" />}
                    </span>
                    <button className="type-text-xs-regular" aria-pressed={vehicle.id === selectedId} onClick={() => onSelect(vehicle.id)}>
                      {vehicle.id}
                    </button>
                  </div>
                </td>
                <td className="type-text-xs-regular">{vehicle.type}</td>
                <td className="type-text-xs-regular">
                  {vehicle.weight.toLocaleString('en-GB')} kg · {vehicle.volume} m³
                </td>
                <td className="type-text-xs-regular">
                  {vehicle.fuelType[0].toUpperCase()}
                  {vehicle.fuelType.slice(1)} · {vehicle.kmPerL} km/L
                </td>
                <td>
                  <StatusBadge tone={availabilityTones[vehicle.availability]}>{vehicle.availability}</StatusBadge>
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <div className="fleet-empty">
                    {loading ? (
                      <p role="status" className="type-text-sm-regular text-wp-text-secondary">
                        Loading vehicles…
                      </p>
                    ) : error ? (
                      <>
                        <h3 className="type-text-lg-semibold">Could not load vehicles</h3>
                        <p role="alert" className="type-text-sm-regular text-wp-text-secondary">
                          {error}
                        </p>
                        <Button onClick={onRetry}>Try again</Button>
                      </>
                    ) : !hasVehicles ? (
                      <>
                        <h3 className="type-text-lg-semibold">No vehicles yet</h3>
                        <p className="type-text-sm-regular text-wp-text-secondary">Vehicles appear here once they are added.</p>
                      </>
                    ) : (
                      <>
                        <h3 className="type-text-lg-semibold">No matching vehicles</h3>
                        <p className="text-wp-text-secondary type-text-sm-regular">Try another search or vehicle filter.</p>
                        <Button onClick={onClear}>Clear filters</Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {meta && meta.total > 0 && (
        <nav className="fleet-pager type-text-sm-regular" aria-label="Vehicle pages">
          <span className="text-wp-text-secondary" role="status">
            Showing {first}–{Math.min(first + vehicles.length - 1, meta.total)} of {meta.total}
          </span>
          <div>
            <Button disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
              Previous
            </Button>
            <span>
              Page {meta.page} of {meta.totalPages}
            </span>
            <Button disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>
              Next
            </Button>
          </div>
        </nav>
      )}
    </>
  )
}
