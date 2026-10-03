import { useState } from "react";
import {
  OrdersTable,
  type OrderTableRow,
} from "@/store-manager/components/store-manager/orders/orders-table";
import {
  OrderDetailsPanel,
  type OrderDetailsData,
} from "@/store-manager/components/store-manager/orders/order-details-panel";
import { Header } from "@/store-manager/components/store-manager/header";
import { useNavigate } from "react-router-dom";

// Full Mock Database containing details for every order ID in the table
const MOCK_ORDER_DETAILS: Record<string, OrderDetailsData> = {
  "DEMO-109": {
    id: "DEMO-109",
    location: "Fresh · Ja-Ela",
    status: "Awaiting scheduling",
    statusVariant: "yellow",
    timelineStatus: "Order received",
    timelineTime: "Submitted today at 06:20",
    timelineMessage:
      "Your order has been received. A delivery date will be confirmed after planning.",
    requestedDelivery: "Wed, 30 Sep",
    requirement: "Ambient",
    quantity: "24 cases",
    totalWeight: "180 kg",
    totalVolume: "1.2 m³",
    receivingWindow: "06:00–08:00",
    arrivalTime: "Not yet scheduled",
  },
  "DEMO-108": {
    id: "DEMO-108",
    location: "Fresh · Ja-Ela",
    status: "Deferred",
    statusVariant: "red",
    timelineStatus: "Order deferred",
    timelineTime: "27 Sep · 16:15",
    timelineMessage:
      "This order was deferred because it missed the cutoff window. It has been moved to the next run.",
    requestedDelivery: "Mon, 28 Sep",
    requirement: "Frozen",
    quantity: "18 cases",
    totalWeight: "140 kg",
    totalVolume: "0.9 m³",
    receivingWindow: "06:00–08:00",
    arrivalTime: "Deferred to next run",
  },
  "DEMO-106": {
    id: "DEMO-106",
    location: "Fresh · Ja-Ela",
    status: "Scheduled",
    statusVariant: "green",
    timelineStatus: "Delivery scheduled",
    timelineTime: "28 Sep · 10:00",
    timelineMessage:
      "Your delivery has been scheduled and assigned to vehicle VEH038 out of Peliyagoda depot.",
    requestedDelivery: "Tue, 29 Sep",
    requirement: "Chilled",
    quantity: "32 cases",
    totalWeight: "220 kg",
    totalVolume: "1.5 m³",
    receivingWindow: "06:00–08:00",
    arrivalTime: "07:40 (Expected)",
  },
  "DEMO-105": {
    id: "DEMO-105",
    location: "Fresh · Ja-Ela",
    status: "On the way",
    statusVariant: "green",
    timelineStatus: "En route",
    timelineTime: "Today at 05:50",
    timelineMessage:
      "Vehicle VEH012 has departed the Peliyagoda depot and is currently en route to your outlet.",
    requestedDelivery: "Tue, 29 Sep",
    requirement: "Ambient",
    quantity: "40 cases",
    totalWeight: "300 kg",
    totalVolume: "2.1 m³",
    receivingWindow: "06:00–08:00",
    arrivalTime: "07:10 (Planned)",
  },
  "DEMO-099": {
    id: "DEMO-099",
    location: "Fresh · Ja-Ela",
    status: "Awaiting receipt",
    statusVariant: "red",
    timelineStatus: "Driver recorded delivery",
    timelineTime: "28 Sep · 07:18",
    timelineMessage:
      "The driver has marked this delivery as complete. Please confirm your received inventory quantities.",
    requestedDelivery: "Mon, 28 Sep",
    requirement: "Ambient",
    quantity: "36 cases",
    totalWeight: "270 kg",
    totalVolume: "1.8 m³",
    receivingWindow: "06:00–08:00",
    arrivalTime: "07:18 (Delivered)",
  },
  "DEMO-094": {
    id: "DEMO-094",
    location: "Fresh · Ja-Ela",
    status: "Receipt confirmed",
    statusVariant: "green",
    timelineStatus: "Completed",
    timelineTime: "26 Sep · 07:30",
    timelineMessage:
      "Delivery has been verified, accepted, and recorded into system inventory successfully.",
    requestedDelivery: "Sat, 26 Sep",
    requirement: "Chilled",
    quantity: "20 cases",
    totalWeight: "150 kg",
    totalVolume: "1.0 m³",
    receivingWindow: "06:00–08:00",
    arrivalTime: "07:30",
  },
};

export function OrdersPage() {
  const navigate = useNavigate();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    "DEMO-109",
  );
  const tableData: OrderTableRow[] = [
      {
        id: "DEMO-109",
        requestedDate: "30 Sep",
        requirement: "Ambient",
        quantity: "24 cases",
        status: "Awaiting scheduling",
        statusVariant: "yellow",
      },
      {
        id: "DEMO-108",
        requestedDate: "28 Sep",
        requirement: "Frozen",
        quantity: "18 cases",
        status: "Deferred",
        statusVariant: "red",
      },
      {
        id: "DEMO-106",
        requestedDate: "29 Sep",
        requirement: "Chilled",
        quantity: "32 cases",
        status: "Scheduled",
        statusVariant: "green",
      },
      {
        id: "DEMO-105",
        requestedDate: "29 Sep",
        requirement: "Ambient",
        quantity: "40 cases",
        status: "On the way",
        statusVariant: "green",
      },
      {
        id: "DEMO-099",
        requestedDate: "28 Sep",
        requirement: "Ambient",
        quantity: "36 cases",
        status: "Awaiting receipt",
        statusVariant: "red",
      },
      {
        id: "DEMO-094",
        requestedDate: "26 Sep",
        requirement: "Chilled",
        quantity: "20 cases",
        status: "Receipt confirmed",
        statusVariant: "green",
      },
  ];
  const panelData = selectedOrderId ? MOCK_ORDER_DETAILS[selectedOrderId] ?? null : null;

  return (
    <div className="flex-1 pr-2 py-2 flex flex-col h-full overflow-hidden bg-neutral-50">
      <div className="w-full bg-white rounded-2xl outline outline-1 outline-offset-[-1px] outline-stone-200 flex flex-col p-8 gap-5 h-full overflow-hidden">
        <Header
          title="Orders"
          deliveryCode=""
          dateLabel="Tuesday, 29 September · Your outlet at a glance"
          breadcrumbs={[]}
          onPlaceOrder={() => navigate("/orders/create")}
        />

        {/* Main Content Layout (List + Panel) */}
        <div className="flex flex-1 gap-4 overflow-hidden pt-1">
          <OrdersTable
            items={tableData}
            selectedId={selectedOrderId}
            onSelect={setSelectedOrderId}
          />
          <OrderDetailsPanel data={panelData} />
        </div>
      </div>
    </div>
  );
}
