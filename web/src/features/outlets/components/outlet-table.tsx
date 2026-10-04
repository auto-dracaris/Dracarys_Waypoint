import SwapVertRounded from '@mui/icons-material/SwapVertRounded'
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded'
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded'
import { Button } from '@/components/ui/button'
import type { Outlet, OutletSort, OutletSortKey, PageMeta } from '../data'

const columns: { label: string; key: OutletSortKey }[] = [
  { label: 'Outlet', key: 'id' },
  { label: 'Name', key: 'name' },
  { label: 'Brand', key: 'brand' },
  { label: 'District', key: 'district' },
  { label: 'Delivery window', key: 'windowStart' },
  { label: 'Access', key: 'access' },
]

export function OutletTable({
  outlets,
  selectedId,
  sort,
  loading,
  error,
  hasOutlets,
  meta,
  onPage,
  onSort,
  onSelect,
  onClear,
  onRetry,
}: {
  outlets: Outlet[]
  selectedId?: string
  sort: OutletSort
  loading: boolean
  error: string
  hasOutlets: boolean
  meta: PageMeta | null
  onPage: (page: number) => void
  onSort: (key: OutletSortKey) => void
  onSelect: (id: string) => void
  onClear: () => void
  onRetry: () => void
}) {
  const first = meta ? (meta.page - 1) * meta.limit + 1 : 0
  return (
    <>
      <div className="fleet-table-scroll" role="region" aria-label="Outlet inventory" tabIndex={0}>
        <table className="fleet-table outlet-table">
          <caption className="sr-only">Outlet inventory. Select an outlet to view its requirements; use column headings to sort.</caption>
          <thead>
            <tr>
              {columns.map(({ label, key }) => (
                <th key={key} scope="col" aria-sort={sort.key === key ? sort.direction : 'none'}>
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
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {outlets.map((outlet) => (
              <tr key={outlet.id} className={outlet.id === selectedId ? 'fleet-row-selected' : ''} onClick={() => onSelect(outlet.id)}>
                <td>
                  <div className="fleet-id-cell">
                    <button aria-pressed={outlet.id === selectedId} onClick={() => onSelect(outlet.id)}>
                      {outlet.id}
                    </button>
                  </div>
                </td>
                <td>{outlet.name}</td>
                <td>{outlet.brand}</td>
                <td>{outlet.district}</td>
                <td>
                  {outlet.windowStart} – {outlet.windowEnd}
                </td>
                <td>{outlet.access}</td>
              </tr>
            ))}
            {!outlets.length && (
              <tr>
                <td colSpan={6}>
                  <div className="fleet-empty">
                    {loading ? (
                      <p role="status" className="type-text-sm-regular text-wp-text-secondary">
                        Loading outlets…
                      </p>
                    ) : error ? (
                      <>
                        <h3 className="type-text-lg-semibold">Could not load outlets</h3>
                        <p role="alert" className="type-text-sm-regular text-wp-text-secondary">
                          {error}
                        </p>
                        <Button onClick={onRetry}>Try again</Button>
                      </>
                    ) : !hasOutlets ? (
                      <>
                        <h3 className="type-text-lg-semibold">No outlets yet</h3>
                        <p className="type-text-sm-regular text-wp-text-secondary">Outlets appear here once they are added.</p>
                      </>
                    ) : (
                      <>
                        <h3 className="type-text-lg-semibold">No matching outlets</h3>
                        <p className="type-text-sm-regular text-wp-text-secondary">Try another search or availability filter.</p>
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
        <nav className="fleet-pager type-text-sm-regular" aria-label="Outlet pages">
          <span className="text-wp-text-secondary" role="status">
            Showing {first}–{Math.min(first + outlets.length - 1, meta.total)} of {meta.total}
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
