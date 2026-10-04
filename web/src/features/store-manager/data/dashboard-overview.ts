import type { ComponentProps } from 'react'
import type { TodayDeliveries } from '../components/my-deliveries/today-deliveries'
import type { RecentOrdersTable } from '../components/my-deliveries/recent-orders-table'

export interface DashboardData {
  metrics: {
    expectedToday: number
    awaitingReceipt: number
    deferredOrders: number
  }
  todayDeliveries: ComponentProps<typeof TodayDeliveries>['deliveries']
  nextRun: {
    dateLabel: string
    cutoffTime: string
  }
  deferredOrder: {
    orderTitle: string
    reason: string
    statusLabel: string
  }
  recentOrders: ComponentProps<typeof RecentOrdersTable>['orders']
}

export const mockApiData: DashboardData = {
  metrics: {
    expectedToday: 2,
    awaitingReceipt: 1,
    deferredOrders: 1,
  },
  todayDeliveries: [
    {
      id: 'VEH012',
      vehicleType: 'Van',
      statusLabel: 'En route',
      orderCode: 'ORD-4401 · Chilled',
      receivingWindow: '06:00–08:00',
      plannedArrival: '07:10',
    },
    {
      id: 'VEH038',
      vehicleType: 'Truck',
      statusLabel: 'En route',
      orderCode: 'ORD-4402 · Ambient',
      receivingWindow: '10:00–12:00',
      plannedArrival: '11:25',
    },
  ],
  nextRun: {
    dateLabel: 'Wednesday, 30 September',
    cutoffTime: 'Today at 16:00',
  },
  deferredOrder: {
    orderTitle: 'DEMO-108 · Frozen goods',
    reason: 'No suitable refrigerated vehicle was available.',
    statusLabel: 'Needs attention',
  },
  recentOrders: [
    {
      id: 'ORD-4401',
      date: '29 Sep 2026',
      requirement: 'Chilled',
      quantity: '32 cases',
      status: 'On the way',
      statusColor: 'bg-yellow-100 text-yellow-700',
      actionText: 'View delivery',
    },
    {
      id: 'ORD-4402',
      date: '29 Sep 2026',
      requirement: 'Ambient',
      quantity: '40 cases',
      status: 'Scheduled',
      statusColor: 'bg-blue-100 text-blue-700',
      actionText: 'View delivery',
    },
    {
      id: 'DEMO-099',
      date: '28 Sep 2026',
      requirement: 'Ambient',
      quantity: '36 cases',
      status: 'Awaiting confirmation',
      statusColor: 'bg-yellow-100 text-yellow-700',
      actionText: 'Review receipt',
    },
    {
      id: 'DEMO-108',
      date: '28 Sep 2026',
      requirement: 'Chilled',
      quantity: '18 cases',
      status: 'Deferred',
      statusColor: 'bg-neutral-100 text-neutral-600',
      actionText: 'View order',
    },
    {
      id: 'DEMO-094',
      date: '26 Sep 2026',
      requirement: 'Chilled',
      quantity: '20 cases',
      status: 'Receipt confirmed',
      statusColor: 'bg-lime-100 text-lime-700',
      actionText: 'View receipt',
    },
    {
      id: 'DEMO-087',
      date: '25 Sep 2026',
      requirement: 'Ambient',
      quantity: '24 cases',
      status: 'Receipt confirmed',
      statusColor: 'bg-lime-100 text-lime-700',
      actionText: 'View receipt',
    },
  ],
}
