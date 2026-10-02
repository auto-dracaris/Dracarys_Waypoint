import { Sidebar } from "@/components/side-bar";
import { Header } from "@/components/header";
import { MetricsOverview } from "@/components/store-manager/delivery-info/metrics-overview";
import { DeliveryRouteMap } from "@/components/store-manager/delivery-info/delivery-route-map";
import { Info } from "lucide-react";
import type { DeliveryDetails } from "@/lib/types";

const deliveryData: DeliveryDetails = {
  vehicleId: "VEH021",
  vehicleType: "Refrigerated van",
  status: "En route",
  plannedArrival: "07:10",
  receivingWindow: "06:00 – 08:00",
  locationName: "Fresh · Ja-Ela",
  deliveryTitle: "Ambient delivery",
  demoId: "DEMO-105",
  date: "Tuesday, 29 September",
  quantity: "40 cases",
  timeline: [
    {
      id: 1,
      title: "Plan confirmed",
      timestamp: "28 Sep · 17:10",
      status: "completed",
    },
    {
      id: 2,
      title: "Loaded at Peliyagoda",
      timestamp: "29 Sep · 05:40",
      status: "completed",
    },
    {
      id: 3,
      title: "On the way",
      timestamp: "Departed 05:50",
      status: "current",
    },
    {
      id: 4,
      title: "Arrival at your outlet",
      timestamp: "Pending",
      status: "pending",
    },
    {
      id: 5,
      title: "Receipt confirmation",
      timestamp: "Available after delivery",
      status: "pending",
    },
  ],
};

const breadcrumbList = [
  { label: "Home" },
  { label: "Dashboard" },
  { label: "Management" },
  { label: "Vehicles", isCurrent: true },
];

const navConfig = [
  { id: "overview", label: "Overview", iconName: "home" as const, path: "/" },
  {
    id: "orders",
    label: "Orders",
    iconName: "orders" as const,
    path: "/orders",
  },
  {
    id: "deliveries",
    label: "Deliveries",
    iconName: "deliveries" as const,
    path: "/deliveries",
  },
];

const userInfo = {
  name: "Dispatcher User",
  initials: "DJ",
  role: "Dispatcher",
  status: "Signed in",
};

export function DeliveryTrackingPage() {
  return (
    <div className="w-full min-h-screen bg-neutral-50 flex justify-start items-start">
      <div className="flex-1 pl-8 pr-6 pt-5 pb-8 flex flex-col gap-6 overflow-hidden">
        <Header
          title="Ambient delivery"
          deliveryCode="DEMO-105"
          dateLabel="Tuesday, 29 September"
          breadcrumbs={breadcrumbList}
          onPlaceOrder={() => console.log("Place order clicked")}
          onOpenNotifications={() => console.log("Open notifications clicked")}
        />
        <MetricsOverview
          plannedArrival={deliveryData.plannedArrival}
          receivingWindow={deliveryData.receivingWindow}
          locationName={deliveryData.locationName}
        />
        <DeliveryRouteMap data={deliveryData} />

        <div className="flex items-center gap-2 text-gray-500 text-xs">
          <Info className="h-4 w-4" />
          <span>Illustrative route and location data</span>
        </div>
      </div>
    </div>
  );
}

export default DeliveryTrackingPage;
