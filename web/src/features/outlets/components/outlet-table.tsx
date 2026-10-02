import SwapVertRounded from '@mui/icons-material/SwapVertRounded'
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded'
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded'
import AddRounded from '@mui/icons-material/AddRounded'
import CheckRounded from '@mui/icons-material/CheckRounded'
import { Button } from '@/components/ui/button'
import type { Outlet, OutletSort, OutletSortKey } from '../data'

const columns: { label: string; key: OutletSortKey }[] = [{ label: 'Outlet', key: 'id' }, { label: 'Brand', key: 'brand' }, { label: 'District', key: 'district' }, { label: 'Delivery window', key: 'windowStart' }, { label: 'Access', key: 'access' }]

export function OutletTable({ outlets, checked, selectedId, sort, showPlaceholders, onSort, onCheck, onSelect, onClear, onAddColumn }: {
  outlets: Outlet[]; checked: Set<string>; selectedId?: string; sort: OutletSort; showPlaceholders: boolean;
  onSort: (key: OutletSortKey) => void; onCheck: (id: string) => void; onSelect: (id: string) => void; onClear: () => void; onAddColumn: () => void;
}) {
  const placeholders = showPlaceholders && outlets.length ? Math.max(0, 10 - outlets.length) : 0
  return <div className="fleet-table-scroll" role="region" aria-label="Outlet inventory" tabIndex={0}>
    <table className="fleet-table outlet-table">
      <caption className="sr-only">Outlet inventory. Select an outlet to view its requirements; use column headings to sort.</caption>
      <thead><tr>{columns.map(({ label, key }) => <th key={key} scope="col" aria-sort={sort.key === key ? sort.direction : 'none'}><button className="type-text-sm-medium" onClick={() => onSort(key)}>{label}{sort.key === key ? sort.direction === 'ascending' ? <ArrowUpwardRounded fontSize="inherit" /> : <ArrowDownwardRounded fontSize="inherit" /> : <SwapVertRounded fontSize="inherit" />}</button></th>)}</tr></thead>
      <tbody>{outlets.map(outlet => <tr key={outlet.id} className={checked.has(outlet.id) ? 'fleet-row-checked' : ''} onClick={() => onSelect(outlet.id)}>
        <td><div className="fleet-id-cell"><span className="fleet-checkbox"><input type="checkbox" aria-label={`Select ${outlet.id}`} checked={checked.has(outlet.id)} onClick={event => event.stopPropagation()} onChange={() => onCheck(outlet.id)} />{checked.has(outlet.id) && <CheckRounded fontSize="inherit" />}</span><button aria-pressed={outlet.id === selectedId} onClick={() => onSelect(outlet.id)}>{outlet.id}</button></div></td>
        <td>{outlet.brand}</td><td>{outlet.district}</td><td>{outlet.windowStart} – {outlet.windowEnd}</td><td>{outlet.access}</td>
      </tr>)}
      {Array.from({ length: placeholders }, (_, index) => <tr className="fleet-placeholder-row" key={index}><td><div className="fleet-id-cell"><span className="fleet-checkbox"><input type="checkbox" disabled aria-label="Empty outlet row" /></span><span>–</span></div></td><td>–</td><td>–</td><td>–</td><td>–</td></tr>)}
      {!outlets.length && <tr><td colSpan={5}><div className="fleet-empty"><h3 className="type-text-lg-semibold">No matching outlets</h3><p className="text-wp-text-secondary type-text-sm-regular">Try another search or allocation filter.</p><Button onClick={onClear}>Clear filters</Button></div></td></tr>}
      </tbody><tfoot><tr><td><button className="fleet-add-column type-text-xs-regular" onClick={onAddColumn}><AddRounded fontSize="inherit" />Add Column</button></td><td /><td /><td /><td /></tr></tfoot>
    </table>
  </div>
}
