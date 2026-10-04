import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/store-manager-header'
import { SummaryCard } from '@/features/store-manager/components/my-deliveries/summary-card'
import { DeliveryHistoryTable, type DeliveryTab } from '@/features/store-manager/components/deliveries/delivery-history-table'
import { DeliveryDetailsPanel } from '@/features/store-manager/components/deliveries/delivery-details-panel'
import { ReportIssueDialog } from '@/features/store-manager/components/deliveries/report-issue-dialog'
import { confirmReceipt, fetchMyDeliveries, reportIssue, type MyDeliveries, type StoreOrder } from '@/features/store-manager/api'
import { awaitsReceipt, canReportIssue, toDeliveryPanel, toHistoryItem } from '@/features/store-manager/delivery-format'
import { formatLongDay, outletLabel } from '@/features/store-manager/order-format'
import type { ReportIssueFormValues } from '@/features/store-manager/types'
import { useUser } from '@/features/auth/user-context'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import Schedule from '@mui/icons-material/Schedule'
import MoveDown from '@mui/icons-material/MoveDown'
import { useNavigate } from 'react-router-dom'

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
    await reportIssue(accessToken, {
      type: data.issueType,
      orderReference: order.reference,
      affectedCases: data.damagedCases,
      note: [`Accepted ${data.acceptedCases} of ${delivered} delivered cases.`, data.notes?.trim()].filter(Boolean).join(' '),
    })
    setActionError('')
    setMessage(`Issue reported for ${order.reference}. The depot will review it.`)
    refresh()
  }

  const metrics = deliveries?.metrics

  return (
    <div className="flex-1 pr-2 py-2 flex flex-col justify-start items-start h-full">
      <div className="w-full bg-white rounded-2xl outline outline-1 outline-offset-[-1px] outline-stone-200 flex flex-col p-8 gap-6 h-full overflow-hidden">
        <Header title="Deliveries" deliveryCode="" dateLabel={`${formatLongDay(today())} · Your outlet at a glance`} breadcrumbs={[]} onPlaceOrder={() => navigate('/store-manager/orders/create')} />

        <div className="self-stretch flex justify-start items-start gap-4">
          <SummaryCard icon={<LocalShippingIcon fontSize="large" />} title="Expected today" value={metrics?.expectedToday ?? '–'} />
          <SummaryCard icon={<Schedule fontSize="large" />} title="Awaiting confirmation" value={metrics?.awaitingConfirmation ?? '–'} />
          <SummaryCard icon={<MoveDown fontSize="large" />} title="Issues open" value={metrics?.issuesOpen ?? '–'} />
        </div>

        <div className="flex flex-1 gap-4 overflow-hidden pt-2">
          <DeliveryHistoryTable
            items={orders.map(toHistoryItem)}
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
