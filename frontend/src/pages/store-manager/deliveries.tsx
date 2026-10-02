import { useState, useEffect } from "react";
import { Header } from "@/components/store-manager/header";
import { SummaryCard } from "@/components/store-manager/my-deliveries/summary-card";
import { DeliveryHistoryTable } from "@/components/store-manager/deliveries/delivery-history-table";
import { DeliveryDetailsPanel } from "@/components/store-manager/deliveries/delivery-details-panel";
import type {
  DeliveryHistoryItem,
  DeliveryDetailsData,
  ReportIssueFormValues,
} from "@/lib/types";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import Schedule from "@mui/icons-material/Schedule";
import MoveDown from "@mui/icons-material/MoveDown";
import { ReportIssueDialog } from "@/components/store-manager/deliveries/report-issue-dialog";
import { useNavigate } from "react-router-dom";

const MOCK_DETAILS_DB: Record<string, DeliveryDetailsData> = {
  "DEMO-099": {
    id: "DEMO-099",
    requirement: "Ambient",
    deliveryDate: "Mon, 28 Sep",
    latestUpdate: "Driver recorded delivery · 07:18",
    status: "Awaiting confirmation",
    statusVariant: "yellow",
    subtitle: "Ambient delivery · Fresh · Ja-Ela",
    vehicle: "VEH022",
    orderedQuantity: "36 cases",
    driverRecorded: "36 cases delivered",
    timeline: [
      {
        id: 1,
        title: "Scheduled",
        timestamp: "27 Sep · 17:10",
        status: "completed",
      },
      {
        id: 2,
        title: "Departed depot",
        timestamp: "28 Sep · 05:50",
        status: "completed",
      },
      {
        id: 3,
        title: "Driver recorded delivery",
        timestamp: "28 Sep · 07:18",
        status: "completed",
      },
      {
        id: 4,
        title: "Outlet confirmation pending",
        timestamp: "Check quantities before confirming",
        status: "current",
      },
    ],
  },
  "DEMO-105": {
    id: "DEMO-105",
    requirement: "Ambient",
    deliveryDate: "Tue, 29 Sep",
    latestUpdate: "Planned arrival · 07:10",
    status: "On the way",
    statusVariant: "red",
    subtitle: "Ambient delivery · Fresh · Ja-Ela",
    vehicle: "VEH012",
    orderedQuantity: "24 cases",
    driverRecorded: "Pending",
    timeline: [
      {
        id: 1,
        title: "Scheduled",
        timestamp: "28 Sep · 17:10",
        status: "completed",
      },
      {
        id: 2,
        title: "Departed depot",
        timestamp: "29 Sep · 05:50",
        status: "completed",
      },
      {
        id: 3,
        title: "On the way",
        timestamp: "Estimated 07:10",
        status: "current",
      },
      {
        id: 4,
        title: "Outlet confirmation pending",
        timestamp: "Pending",
        status: "pending",
      },
    ],
  },
  "DEMO-106": {
    id: "DEMO-106",
    requirement: "Chilled",
    deliveryDate: "Tue, 29 Sep",
    latestUpdate: "Planned arrival · 07:40",
    status: "Scheduled",
    statusVariant: "green",
    subtitle: "Chilled delivery · Fresh · Ja-Ela",
    vehicle: "VEH038",
    orderedQuantity: "40 cases",
    driverRecorded: "Pending",
    timeline: [
      {
        id: 1,
        title: "Scheduled",
        timestamp: "28 Sep · 18:00",
        status: "current",
      },
      {
        id: 2,
        title: "Departed depot",
        timestamp: "Pending",
        status: "pending",
      },
    ],
  },
  "DEMO-094": {
    id: "DEMO-094",
    requirement: "Chilled",
    deliveryDate: "Sat, 26 Sep",
    latestUpdate: "Receipt confirmed",
    status: "Receipt confirmed",
    statusVariant: "green",
    subtitle: "Chilled delivery · Fresh · Ja-Ela",
    vehicle: "VEH015",
    orderedQuantity: "18 cases",
    driverRecorded: "18 cases delivered",
    timeline: [
      {
        id: 1,
        title: "Scheduled",
        timestamp: "25 Sep · 17:10",
        status: "completed",
      },
      {
        id: 2,
        title: "Departed depot",
        timestamp: "26 Sep · 05:50",
        status: "completed",
      },
      {
        id: 3,
        title: "Driver recorded delivery",
        timestamp: "26 Sep · 07:15",
        status: "completed",
      },
      {
        id: 4,
        title: "Receipt confirmed",
        timestamp: "26 Sep · 07:30",
        status: "completed",
      },
    ],
  },
};

export function DeliveriesPage() {
  const navigate = useNavigate();
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(
    "DEMO-099",
  );
  const [historyItems, setHistoryItems] = useState<DeliveryHistoryItem[]>([]);
  const [selectedDetails, setSelectedDetails] =
    useState<DeliveryDetailsData | null>(null);
  const [isReportIssueOpen, setIsReportIssueOpen] = useState(false);

  const handleReportIssueSubmit = (data: ReportIssueFormValues) => {
    console.log("Submitting issue for", selectedDeliveryId, data);
    // TODO: Add your API POST request here
  };

  // 1. Fetch the list of history items (Table Data)
  useEffect(() => {
    const mockHistory: DeliveryHistoryItem[] = [
      {
        id: "DEMO-099",
        requirement: "Ambient",
        deliveryDate: "28 Sep 2026",
        latestUpdate: "Driver recorded delivery · 07:18",
        status: "Awaiting confirmation",
        statusVariant: "yellow",
      },
      {
        id: "DEMO-105",
        requirement: "Ambient",
        deliveryDate: "29 Sep 2026",
        latestUpdate: "Planned arrival · 07:10",
        status: "On the way",
        statusVariant: "red",
      },
      {
        id: "DEMO-106",
        requirement: "Chilled",
        deliveryDate: "29 Sep 2026",
        latestUpdate: "Planned arrival · 07:40",
        status: "Scheduled",
        statusVariant: "green",
      },
      {
        id: "DEMO-094",
        requirement: "Chilled",
        deliveryDate: "26 Sep 2026",
        latestUpdate: "Receipt confirmed",
        status: "Receipt confirmed",
        statusVariant: "green",
      },
    ];
    setHistoryItems(mockHistory);
  }, []);

  // 2. Fetch detailed data dynamically whenever a row is clicked
  useEffect(() => {
    if (!selectedDeliveryId) {
      setSelectedDetails(null);
      return;
    }

    // Simulate an API delay
    const fetchDetails = async () => {
      // In reality: const res = await fetch(`/api/deliveries/${selectedDeliveryId}`);
      // const data = await res.json();

      const data = MOCK_DETAILS_DB[selectedDeliveryId] || null;
      setSelectedDetails(data);
    };

    fetchDetails();
  }, [selectedDeliveryId]);

  return (
    <div className="flex-1 pr-2 py-2 flex flex-col justify-start items-start h-full">
      <div className="w-full bg-white rounded-2xl outline outline-1 outline-offset-[-1px] outline-stone-200 flex flex-col p-8 gap-6 h-full overflow-hidden">
        <Header
          title="Deliveries"
          deliveryCode=""
          dateLabel="Tuesday, 29 September · Your outlet at a glance"
          breadcrumbs={[]}
          onPlaceOrder={() => navigate("/orders/create")}
        />

        <div className="self-stretch flex justify-start items-start gap-4">
          <SummaryCard
            icon={<LocalShippingIcon fontSize="large" />}
            title="Expected today"
            value={2}
          />
          <SummaryCard
            icon={<Schedule fontSize="large" />}
            title="Awaiting confirmation"
            value={1}
          />
          <SummaryCard
            icon={<MoveDown fontSize="large" />}
            title="Issues open"
            value={0}
          />
        </div>

        <div className="flex flex-1 gap-4 overflow-hidden pt-2">
          <DeliveryHistoryTable
            items={historyItems}
            selectedId={selectedDeliveryId}
            onSelect={setSelectedDeliveryId} // <--- Updates state when clicked
          />

          <DeliveryDetailsPanel
            data={selectedDetails}
            onConfirmReceipt={() =>
              console.log("Confirm Receipt", selectedDeliveryId)
            }
            // 4. Update this prop to open the dialog
            onReportIssue={() => {
              setIsReportIssueOpen(true);
              console.log("Clicked");
            }}
          />

          {selectedDetails && (
            <ReportIssueDialog
              open={isReportIssueOpen}
              onOpenChange={setIsReportIssueOpen}
              deliveryId={selectedDetails.id}
              // Parse the string "36 cases" to just the number 36
              totalOrdered={parseInt(selectedDetails.orderedQuantity) || 0}
              onSubmitIssue={handleReportIssueSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
}
