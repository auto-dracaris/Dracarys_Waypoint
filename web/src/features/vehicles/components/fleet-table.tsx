import { StatusBadge } from '@/components/ui/status-badge'
import SwapVertRounded from '@mui/icons-material/SwapVertRounded'
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded'
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded'
import AddRounded from '@mui/icons-material/AddRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import { Button } from '@/components/ui/button'
import type { FleetVehicle } from '../data'

export type VehicleSortKey = 'id' | 'type' | 'weight' | 'plannedTrips' | 'allocation'
export interface VehicleSort { key: VehicleSortKey | null; direction: 'ascending' | 'descending' }
const columns: { label: string; key: VehicleSortKey }[] = [{ label: 'Vehicle', key: 'id' }, { label: 'Type', key: 'type' }, { label: 'Capacity', key: 'weight' }, { label: 'Planned trips', key: 'plannedTrips' }, { label: 'Availability', key: 'allocation' }]

export function FleetTable({ vehicles, checked, selectedId, sort, showPlaceholders, onSort, onCheck, onSelect, onClear, onAddColumn }: {
  vehicles: FleetVehicle[]; checked: Set<string>; selectedId?: string; sort: VehicleSort; showPlaceholders: boolean;
  onSort: (key: VehicleSortKey) => void; onCheck: (id: string) => void; onSelect: (id: string) => void; onClear: () => void; onAddColumn: () => void;
}) {
  const placeholders = showPlaceholders && vehicles.length > 0 ? Math.max(0, 10 - vehicles.length) : 0
  return <div className="fleet-table-scroll" role="region" aria-label="Vehicle inventory" tabIndex={0}>
    <table className="fleet-table">
      <caption className="sr-only">Vehicle inventory. Select a vehicle to view details; use column headings to sort.</caption>
      <thead><tr>{columns.map(({ label, key }) => <th key={key} scope="col" aria-sort={sort.key === key ? sort.direction : 'none'}><button className="type-text-sm-medium" onClick={() => onSort(key)}>{label}{sort.key === key ? sort.direction === 'ascending' ? <ArrowUpwardRounded fontSize="inherit" /> : <ArrowDownwardRounded fontSize="inherit" /> : <SwapVertRounded fontSize="inherit" />}</button></th>)}</tr></thead>
      <tbody>{vehicles.map(vehicle => <tr key={vehicle.id} className={checked.has(vehicle.id) ? 'fleet-row-checked' : ''} onClick={() => onSelect(vehicle.id)}>
        <td><div className="fleet-id-cell"><span className="fleet-checkbox"><input type="checkbox" aria-label={`Select ${vehicle.id}`} checked={checked.has(vehicle.id)} onClick={event => event.stopPropagation()} onChange={() => onCheck(vehicle.id)} />{checked.has(vehicle.id) && <CheckRounded fontSize="inherit" />}</span><button className="type-text-xs-regular" aria-pressed={vehicle.id === selectedId} onClick={() => onSelect(vehicle.id)}>{vehicle.id}</button></div></td>
        <td className="type-text-xs-regular">{vehicle.type}</td>
        <td className="type-text-xs-regular">{vehicle.weight.toLocaleString('en-GB')} kg · {vehicle.volume} m³</td>
        <td className="type-text-xs-regular">{vehicle.plannedTrips} of 2</td>
        <td><StatusBadge tone={vehicle.allocation === 'Unallocated' ? 'error' : 'success'}>{vehicle.allocation}</StatusBadge></td>
      </tr>)}
      {Array.from({ length: placeholders }, (_, index) => <tr className="fleet-placeholder-row" key={`placeholder-${index}`}><td><div className="fleet-id-cell"><span className="fleet-checkbox"><input type="checkbox" disabled aria-label="Empty vehicle row" /></span><span>–</span></div></td><td>–</td><td>–</td><td>–</td><td><StatusBadge tone={index === 1 ? 'error' : 'success'}>{index === 1 ? 'Unallocated' : 'Allocated'}</StatusBadge></td></tr>)}
      {vehicles.length === 0 && <tr><td colSpan={5}><div className="fleet-empty"><h3 className="type-text-lg-semibold">No matching vehicles</h3><p className="text-wp-text-secondary type-text-sm-regular">Try another search or vehicle filter.</p><Button onClick={onClear}>Clear filters</Button></div></td></tr>}
      </tbody>
      <tfoot><tr><td><button className="fleet-add-column type-text-xs-regular" onClick={onAddColumn}><AddRounded fontSize="inherit" />Add Column</button></td><td /><td /><td /><td /></tr></tfoot>
    </table>
  </div>
}
