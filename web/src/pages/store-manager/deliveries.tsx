import { MOCK_DETAILS_DB, historyItems } from '@/features/store-manager/data/deliveries'
import { useState } from "react";
import { Header } from "@/components/layout/store-manager-header";
import { SummaryCard } from "@/features/store-manager/components/my-deliveries/summary-card";
import { DeliveryHistoryTable } from "@/features/store-manager/components/deliveries/delivery-history-table";
import { DeliveryDetailsPanel } from "@/features/store-manager/components/deliveries/delivery-details-panel";
import type {
  ReportIssueFormValues,
} from "@/features/store-manager/types";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import Schedule from "@mui/icons-material/Schedule";
import MoveDown from "@mui/icons-material/MoveDown";
import { ReportIssueDialog } from "@/features/store-manager/components/deliveries/report-issue-dialog";
import { useNavigate } from "react-router-dom";

export function DeliveriesPage() {
  const navigate = useNavigate();
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(
    "DEMO-099",
  );
  const selectedDetails = selectedDeliveryId ? MOCK_DETAILS_DB[selectedDeliveryId] ?? null : null;
  const [isReportIssueOpen, setIsReportIssueOpen] = useState(false);

  const handleReportIssueSubmit = (data: ReportIssueFormValues) => {
    console.log("Submitting issue for", selectedDeliveryId, data);
    // TODO: Add your API POST request here
  };

  return (
    <div className="flex-1 pr-2 py-2 flex flex-col justify-start items-start h-full">
      <div className="w-full bg-white rounded-2xl outline outline-1 outline-offset-[-1px] outline-stone-200 flex flex-col p-8 gap-6 h-full overflow-hidden">
        <Header
          title="Deliveries"
          deliveryCode=""
          dateLabel="Tuesday, 29 September · Your outlet at a glance"
          breadcrumbs={[]}
          onPlaceOrder={() => navigate("/store-manager/orders/create")}
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
            key={selectedDeliveryId}
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
