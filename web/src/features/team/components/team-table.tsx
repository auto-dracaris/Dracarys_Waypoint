import SwapVertRounded from '@mui/icons-material/SwapVertRounded'
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded'
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { staffStatusTones, type StaffMember, type TeamSort, type TeamSortKey } from '../data'

const columns: { label: string; key: TeamSortKey }[] = [{ label: 'Staff member', key: 'name' }, { label: 'Phone', key: 'phone' }, { label: 'Role', key: 'role' }, { label: 'Depot', key: 'depot' }, { label: "Today's assignment", key: 'assignment' }]

export function TeamTable({ members, selectedId, sort, loading, error, hasStaff, onSort, onSelect, onClear, onRetry }: {
  members: StaffMember[]; selectedId?: string; sort: TeamSort; loading: boolean; error: string; hasStaff: boolean;
  onSort: (key: TeamSortKey) => void; onSelect: (id: string) => void; onClear: () => void; onRetry: () => void;
}) {
  return <div className="fleet-table-scroll" role="region" aria-label="Staff roster" tabIndex={0}>
    <table className="fleet-table team-table"><caption className="sr-only">Staff roster. Select a staff member to view work details and trips; use column headings to sort.</caption>
      <colgroup><col className="team-member-column" /><col /><col /><col /><col /></colgroup>
      <thead><tr>{columns.map(({ label, key }) => <th key={key} scope="col" aria-sort={sort.key === key ? sort.direction : 'none'}><button className="type-text-sm-medium" onClick={() => onSort(key)}>{label}{sort.key === key ? sort.direction === 'ascending' ? <ArrowUpwardRounded fontSize="inherit" /> : <ArrowDownwardRounded fontSize="inherit" /> : <SwapVertRounded fontSize="inherit" />}</button></th>)}</tr></thead>
      <tbody>{members.map(member => <tr key={member.id} onClick={() => onSelect(member.id)}>
        <td><button className="team-member" aria-pressed={selectedId === member.id} onClick={() => onSelect(member.id)}><span className="team-avatar type-text-md-medium" aria-hidden="true">{member.initials}</span><span className="team-identity"><strong className="type-text-md-semibold">{member.name}</strong><StatusBadge tone={staffStatusTones[member.statusKey]}>{member.status}</StatusBadge></span></button></td>
        <td>{member.phone}</td><td>{member.role}</td><td>{member.depot}</td><td>{member.assignment}</td>
      </tr>)}
      {!members.length && <tr><td colSpan={5}><div className="fleet-empty">
        {loading ? <p role="status" className="type-text-sm-regular text-wp-text-secondary">Loading staff…</p>
          : error ? <><h3 className="type-text-lg-semibold">Could not load staff</h3><p role="alert" className="type-text-sm-regular text-wp-text-secondary">{error}</p><Button onClick={onRetry}>Try again</Button></>
          : !hasStaff ? <><h3 className="type-text-lg-semibold">No staff yet</h3><p className="type-text-sm-regular text-wp-text-secondary">Staff appear here once they register.</p></>
          : <><h3 className="type-text-lg-semibold">No matching staff</h3><p className="type-text-sm-regular text-wp-text-secondary">Try another name, phone number, vehicle, or role filter.</p><Button onClick={onClear}>Clear filters</Button></>}
      </div></td></tr>}
      </tbody>
    </table>
  </div>
}
