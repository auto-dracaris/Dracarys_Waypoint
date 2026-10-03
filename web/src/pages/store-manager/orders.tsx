import { MOCK_ORDER_DETAILS, tableData } from '@/features/store-manager/data/orders'
import { useState } from 'react'
import { OrdersTable } from '@/features/store-manager/components/orders/orders-table'
import { OrderDetailsPanel } from '@/features/store-manager/components/orders/order-details-panel'
import { Header } from '@/components/layout/store-manager-header'
import { useNavigate } from 'react-router-dom'

export function OrdersPage() {
  const navigate = useNavigate()
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>('DEMO-109')

  const panelData = selectedOrderId ? (MOCK_ORDER_DETAILS[selectedOrderId] ?? null) : null

  return (
    <div className="flex-1 pr-2 py-2 flex flex-col h-full overflow-hidden bg-neutral-50">
      <div className="w-full bg-white rounded-2xl outline outline-1 outline-offset-[-1px] outline-stone-200 flex flex-col p-8 gap-5 h-full overflow-hidden">
        <Header title="Orders" deliveryCode="" dateLabel="Tuesday, 29 September · Your outlet at a glance" breadcrumbs={[]} onPlaceOrder={() => navigate('/store-manager/orders/create')} />

        {/* Main Content Layout (List + Panel) */}
        <div className="flex flex-1 gap-4 overflow-hidden pt-1">
          <OrdersTable items={tableData} selectedId={selectedOrderId} onSelect={setSelectedOrderId} />
          <OrderDetailsPanel data={panelData} />
        </div>
      </div>
    </div>
  )
}
