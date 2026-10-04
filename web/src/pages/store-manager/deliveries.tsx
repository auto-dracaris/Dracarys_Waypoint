import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DeliveryDateFilter } from '@/features/store-manager/components/deliveries/delivery-date-filter'
import ShoppingCartRounded from '@mui/icons-material/ShoppingCartRounded'
import '@/styles/store-manager/deliveries.css'
import { DeliveryHistoryTable, type DeliveryTab } from '@/features/store-manager/components/deliveries/delivery-history-table'
import { DeliveryDetailsPanel } from '@/features/store-manager/components/deliveries/delivery-details-panel'
import { ReportIssueDialog } from '@/features/store-manager/components/deliveries/report-issue-dialog'
import { confirmReceipt, fetchMyDeliveries, reportIssue, type MyDeliveries, type ReceiptIssueType, type StoreOrder } from '@/features/store-manager/api'
import { awaitsReceipt, canReportIssue, toDeliveryPanel, toHistoryItem } from '@/features/store-manager/delivery-format'
import { formatLongDay, outletLabel } from '@/features/store-manager/order-format'
import type { ReportIssueFormValues } from '@/features/store-manager/types'
import { useUser } from '@/features/auth/user-context'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import Schedule from '@mui/icons-material/Schedule'
import MoveDown from '@mui/icons-material/MoveDown'
import { useNavigate } from 'react-router-dom'

// The form's issue types (which the AI draft also uses) as the issues API's.
const issueTypes: Record<ReportIssueFormValues['issueType'], ReceiptIssueType> = {
  'Damaged goods': 'receipt_damage',
  'Missing goods': 'receipt_shortfall',
  'Wrong items': 'other',
}

// Today where Waypoint operates, as YYYY-MM-DD.
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(new Date())

export function DeliveriesPage() {
  const navigate = useNavigate()
  const { accessToken } = useUser()
  // `null` until the first load settles.
  const [deliveries, setDeliveries] = useState<MyDeliveries | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState<DeliveryTab>('all')
  const [date, setDate] = useState('')
  const [query, setQuery] = useState('')
  // What the API is actually asked for; trails `query` so typing doesn't fire a request per key.
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isReportIssueOpen, setIsReportIssueOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [actionError, setActionError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(query)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!accessToken) return
    let stale = false
    fetchMyDeliveries(accessToken, { page, stage: tab === 'all' ? undefined : tab, date, search: searchTerm })
      .then(
        (data) => {
          if (stale) return
          setDeliveries(data)
          setError('')
        },
        (reason: Error) => {
          if (!stale) setError(reason.message)
        },
      )
      .finally(() => {
        if (!stale) setLoading(false)
      })
    return () => {
      stale = true
    }
  }, [accessToken, attempt, page, tab, date, searchTerm])

  const orders = deliveries?.items ?? []
  const selected = orders.find((order) => order.reference === selectedId) ?? orders[0]
  const refresh = () => setAttempt((count) => count + 1)
  // A new filter starts from its first page.
  const filtered =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value)
      setPage(1)
    }

  async function confirm(order: StoreOrder) {
    if (!accessToken) return
    setConfirming(true)
    setActionError('')
    setMessage('')
    try {
      await confirmReceipt(accessToken, order.id, order.assignment?.deliveredUnits ?? 0)
      setMessage(`Receipt for ${order.reference} confirmed.`)
      refresh()
    } catch (reason) {
      setActionError((reason as Error).message)
    } finally {
      setConfirming(false)
    }
  }

  async function submitIssue(order: StoreOrder, data: ReportIssueFormValues) {
    if (!accessToken) return
    const delivered = order.assignment?.deliveredUnits ?? 0
    // Missing cases are whatever of the order was neither accepted nor damaged.
    const missing = order.orderUnits - data.acceptedCases - data.damagedCases
    if (data.issueType === 'Missing goods' && missing < 1) throw new Error('The quantities do not show any missing cases. Please check them.')
    const affectedCases = data.issueType === 'Missing goods' ? missing : data.damagedCases || undefined
    await reportIssue(accessToken, {
      type: issueTypes[data.issueType],
      orderReference: order.reference,
      affectedCases,
      note: [`Accepted ${data.acceptedCases} of ${delivered} delivered cases.`, data.notes?.trim()].filter(Boolean).join(' '),
    })
    setActionError('')
    setMessage(`Issue reported for ${order.reference}. The depot will review it.`)
    refresh()
  }

  const metrics = deliveries?.metrics

  return (
    <div className="store-deliveries-page">
      <div className="store-deliveries-surface">
        <header className="store-deliveries-header">
          <div><h1 className="type-display-lg-medium">Deliveries</h1><p className="type-text-sm-regular">{formatLongDay(today())} · Your outlet at a glance</p></div>
          <div className="store-deliveries-header-actions">
            <DeliveryDateFilter header date={date} onDate={filtered(setDate)} />
            <Button variant="primary" size="md" trailingIcon={<ShoppingCartRounded />} onClick={() => navigate('/store-manager/orders/create')}>Place Order</Button>
          </div>
        </header>

        <div className="store-deliveries-metrics">
          {[
            { label: 'Expected today', icon: <LocalShippingIcon />, value: metrics?.expectedToday },
            { label: 'Awaiting confirmation', icon: <Schedule />, value: metrics?.awaitingConfirmation },
            { label: 'Issues open', icon: <MoveDown />, value: metrics?.issuesOpen },
          ].map(({ label, icon, value }) => <div className="store-delivery-metric" key={label}>
            <div><span aria-hidden="true">{icon}</span><span className="type-text-md-medium">{label}</span></div>
            <p className="type-display-xl-semibold">{value ?? '–'}</p>
          </div>)}
        </div>

        <div className="store-deliveries-workspace">
          <DeliveryHistoryTable
            items={orders.map((order) => ({ ...toHistoryItem(order), sortDate: order.assignment?.serviceDate }))}
            selectedId={selected?.reference ?? null}
            onSelect={(id) => {
              setSelectedId(id)
              setActionError('')
              setMessage('')
            }}
            counts={deliveries?.counts ?? null}
            tab={tab}
            onTab={filtered(setTab)}
            search={query}
            onSearch={setQuery}
            date={date}
            onDate={filtered(setDate)}
            loading={loading && !deliveries}
            error={error}
            onRetry={() => {
              setError('')
              refresh()
            }}
            meta={deliveries?.meta ?? null}
            onPage={setPage}
          />

          <DeliveryDetailsPanel
            key={selected?.reference}
            data={selected ? toDeliveryPanel(selected) : null}
            onConfirmReceipt={selected && awaitsReceipt(selected) ? () => void confirm(selected) : undefined}
            onReportIssue={selected && canReportIssue(selected) ? () => setIsReportIssueOpen(true) : undefined}
            confirming={confirming}
            error={actionError}
            message={message}
          />

          {selected && (
            <ReportIssueDialog
              open={isReportIssueOpen}
              onOpenChange={setIsReportIssueOpen}
              deliveryId={selected.reference}
              outletLabel={selected.outlet ? outletLabel(selected.outlet) : ''}
              totalOrdered={selected.orderUnits}
              deliveredUnits={selected.assignment?.deliveredUnits ?? 0}
              onSubmitIssue={(data) => submitIssue(selected, data)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
