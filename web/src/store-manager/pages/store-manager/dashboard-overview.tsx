import { useState, useEffect, type ComponentProps } from "react";
import { Header } from "@/store-manager/components/store-manager/header";
import { SummaryCard } from "@/store-manager/components/store-manager/my-deliveries/summary-card";
import { TodayDeliveries } from "@/store-manager/components/store-manager/my-deliveries/today-deliveries";
import { NextRunCard } from "@/store-manager/components/store-manager/my-deliveries/next-run-card";
import { DeferredOrderCard } from "@/store-manager/components/store-manager/my-deliveries/deferred-order-card";
import { RecentOrdersTable } from "@/store-manager/components/store-manager/my-deliveries/recent-orders-table";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import { useNavigate } from "react-router-dom";

// This interface defines the expected API response structure
interface DashboardData {
  metrics: {
    expectedToday: number;
    awaitingReceipt: number;
    deferredOrders: number;
  };
  todayDeliveries: ComponentProps<typeof TodayDeliveries>["deliveries"];
  nextRun: {
    dateLabel: string;
    cutoffTime: string;
  };
  deferredOrder: {
    orderTitle: string;
    reason: string;
    statusLabel: string;
  };
  recentOrders: ComponentProps<typeof RecentOrdersTable>["orders"];
}

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

      const mockApiData: DashboardData = {
        metrics: {
          expectedToday: 2,
          awaitingReceipt: 1,
          deferredOrders: 1,
        },
        todayDeliveries: [
          {
            id: "VEH012",
            vehicleType: "Van",
            statusLabel: "En route",
            orderCode: "ORD-4401 · Chilled",
            receivingWindow: "06:00–08:00",
            plannedArrival: "07:10",
          },
          {
            id: "VEH038",
            vehicleType: "Truck",
            statusLabel: "En route",
            orderCode: "ORD-4402 · Ambient",
            receivingWindow: "10:00–12:00",
            plannedArrival: "11:25",
          },
        ],
        nextRun: {
          dateLabel: "Wednesday, 30 September",
          cutoffTime: "Today at 16:00",
        },
        deferredOrder: {
          orderTitle: "DEMO-108 · Frozen goods",
          reason: "No suitable refrigerated vehicle was available.",
          statusLabel: "Needs attention",
        },
        recentOrders: [
          {
            id: "ORD-4401",
            date: "29 Sep 2026",
            requirement: "Chilled",
            quantity: "32 cases",
            status: "On the way",
            statusColor: "bg-yellow-100 text-yellow-700",
            actionText: "View delivery",
          },
          {
            id: "ORD-4402",
            date: "29 Sep 2026",
            requirement: "Ambient",
            quantity: "40 cases",
            status: "Scheduled",
            statusColor: "bg-blue-100 text-blue-700",
            actionText: "View delivery",
          },
          {
            id: "DEMO-099",
            date: "28 Sep 2026",
            requirement: "Ambient",
            quantity: "36 cases",
            status: "Awaiting confirmation",
            statusColor: "bg-yellow-100 text-yellow-700",
            actionText: "Review receipt",
          },
          {
            id: "DEMO-108",
            date: "28 Sep 2026",
            requirement: "Chilled",
            quantity: "18 cases",
            status: "Deferred",
            statusColor: "bg-neutral-100 text-neutral-600",
            actionText: "View order",
          },
          {
            id: "DEMO-094",
            date: "26 Sep 2026",
            requirement: "Chilled",
            quantity: "20 cases",
            status: "Receipt confirmed",
            statusColor: "bg-lime-100 text-lime-700",
            actionText: "View receipt",
          },
          {
            id: "DEMO-087",
            date: "25 Sep 2026",
            requirement: "Ambient",
            quantity: "24 cases",
            status: "Receipt confirmed",
            statusColor: "bg-lime-100 text-lime-700",
            actionText: "View receipt",
          },
        ],
      };

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
          onPlaceOrder={() => navigate("/orders/create")}
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
