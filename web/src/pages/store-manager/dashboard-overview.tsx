import { mockApiData, type DashboardData } from '@/features/store-manager/data/dashboard-overview'
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/store-manager-header";
import { SummaryCard } from "@/features/store-manager/components/my-deliveries/summary-card";
import { TodayDeliveries } from "@/features/store-manager/components/my-deliveries/today-deliveries";
import { NextRunCard } from "@/features/store-manager/components/my-deliveries/next-run-card";
import { DeferredOrderCard } from "@/features/store-manager/components/my-deliveries/deferred-order-card";
import { RecentOrdersTable } from "@/features/store-manager/components/my-deliveries/recent-orders-table";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import { useNavigate } from "react-router-dom";

export function DashboardOverviewPage() {
  const navigate = useNavigate();
  // Setup state for future API connection
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  // Mock API Call (Replace with real fetch/axios later)
  useEffect(() => {
    const fetchDashboardData = async () => {
      // Simulating API delay
      // const response = await fetch('/api/dashboard/overview');
      // const data = await response.json();

      setDashboardData(mockApiData);
      setIsLoading(false);
    };

    fetchDashboardData();
  }, []);

  if (isLoading || !dashboardData) {
    return (
      <div className="p-8 text-stone-500 font-medium">
        Loading dashboard data...
      </div>
    );
  }

  return (
    <div className="flex-1 pr-2 py-2 flex flex-col justify-start items-start gap-2 h-full">
      <div className="self-stretch p-8 bg-white rounded-2xl outline outline-1 outline-offset-[-1px] outline-stone-200 flex flex-col justify-start items-start gap-6">
        {/* Dashboard Header */}
        <Header
          title="My deliveries"
          deliveryCode=""
          dateLabel="Tuesday, 29 September · Your outlet at a glance"
          breadcrumbs={[]}
          onPlaceOrder={() => navigate("/store-manager/orders/create")}
        />

        {/* Top Metrics Row */}
        <div className="self-stretch flex justify-start items-start gap-3">
          <SummaryCard
            icon={<LocalShippingIcon fontSize="large" />}
            title="Expected today"
            value={dashboardData.metrics.expectedToday}
          />
          <SummaryCard
            icon={<ReceiptLongIcon fontSize="large" />}
            title="Awaiting receipt"
            value={dashboardData.metrics.awaitingReceipt}
          />
          <SummaryCard
            icon={<PauseCircleIcon fontSize="large" />}
            title="Deferred orders"
            value={dashboardData.metrics.deferredOrders}
            isWarning={true}
          />
        </div>

        {/* Middle Grid: Today's Deliveries & Side Panels */}
        <div className="self-stretch flex justify-start items-start gap-4">
          {/* Left Column: Deliveries List */}
          <div className="flex-1 self-stretch flex flex-col">
            <TodayDeliveries deliveries={dashboardData.todayDeliveries} />
          </div>

          {/* Right Column: Next Run & Deferred */}
          <div className="flex flex-1 flex-col justify-start items-start gap-4">
            <NextRunCard
              dateLabel={dashboardData.nextRun.dateLabel}
              cutoffTime={dashboardData.nextRun.cutoffTime}
              onPlaceOrder={() => console.log("Place order next run")}
            />

            <DeferredOrderCard
              orderTitle={dashboardData.deferredOrder.orderTitle}
              reason={dashboardData.deferredOrder.reason}
              statusLabel={dashboardData.deferredOrder.statusLabel}
              onViewOrder={() => console.log("View deferred order")}
            />
          </div>
        </div>

        {/* Bottom Section: Recent Orders Table */}
        <div className="self-stretch flex flex-col gap-5 mt-2">
          <RecentOrdersTable orders={dashboardData.recentOrders} />
        </div>
      </div>
    </div>
  );
}

export default DashboardOverviewPage;
