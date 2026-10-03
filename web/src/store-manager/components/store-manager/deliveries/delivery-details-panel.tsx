import React, { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/store-manager/components/ui/button";
import type { DeliveryDetailsData } from "@/store-manager/lib/types";

interface DeliveryDetailsPanelProps {
  data: DeliveryDetailsData | null;
  onConfirmReceipt: () => void;
  onReportIssue: () => void;
}

export function DeliveryDetailsPanel({
  data,
  onConfirmReceipt,
  onReportIssue,
}: DeliveryDetailsPanelProps) {
  // 1. Add local state to track the two-step confirmation
  const [isReviewing, setIsReviewing] = useState(false);

  if (!data)
    return (
      <div className="w-96 p-6 bg-white rounded-xl border border-neutral-200">
        Select a delivery...
      </div>
    );

  const statusStyles = {
    yellow: "bg-yellow-100 text-yellow-700",
    green: "bg-lime-100 text-lime-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    default: "bg-neutral-100 text-neutral-700",
  }[data.statusVariant];

  // 3. Handle the two-step click logic
  const handleConfirmClick = () => {
    if (!isReviewing) {
      // First click: switch to review mode
      setIsReviewing(true);
    } else {
      // Second click: execute the actual confirmation
      onConfirmReceipt();
      setIsReviewing(false);
    }
  };

  return (
    <div className="flex-1 shrink-0 bg-white rounded-xl border border-neutral-200 shadow-sm flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-neutral-200 flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h2 className="text-stone-900 text-2xl font-medium font-sans">
            {data.id}
          </h2>
          <p className="text-stone-500 text-sm font-sans">{data.subtitle}</p>
        </div>
        <div
          className={`px-2.5 py-1 rounded-full text-xs font-medium font-sans ${statusStyles}`}
        >
          {data.status}
        </div>
      </div>

      {/* Content Scroll Area */}
      <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
        {/* Delivery Details Table */}
        <div className="flex flex-col gap-3">
          <h3 className="text-stone-900 text-sm font-semibold font-sans">
            Delivery details
          </h3>
          <div className="flex flex-col rounded-lg border border-neutral-200 overflow-hidden">
            <div className="flex border-b border-neutral-200 bg-neutral-50 h-11 items-center">
              <div className="w-40 px-4 text-stone-500 text-sm font-medium font-sans border-r border-neutral-200 h-full flex items-center bg-neutral-100">
                Delivery date
              </div>
              <div className="flex-1 px-4 text-stone-900 text-sm font-sans">
                {data.deliveryDate}
              </div>
            </div>
            <div className="flex border-b border-neutral-200 bg-neutral-50 h-11 items-center">
              <div className="w-40 px-4 text-stone-500 text-sm font-medium font-sans border-r border-neutral-200 h-full flex items-center bg-neutral-100">
                Vehicle
              </div>
              <div className="flex-1 px-4 text-stone-900 text-sm font-sans">
                {data.vehicle}
              </div>
            </div>
            <div className="flex border-b border-neutral-200 bg-neutral-50 h-11 items-center">
              <div className="w-40 px-4 text-stone-500 text-sm font-medium font-sans border-r border-neutral-200 h-full flex items-center bg-neutral-100">
                Ordered quantity
              </div>
              <div className="flex-1 px-4 text-stone-900 text-sm font-sans">
                {data.orderedQuantity}
              </div>
            </div>
            <div className="flex bg-neutral-50 h-11 items-center">
              <div className="w-40 px-4 text-stone-500 text-sm font-medium font-sans border-r border-neutral-200 h-full flex items-center bg-neutral-100">
                Driver recorded
              </div>
              <div className="flex-1 px-4 text-stone-900 text-sm font-sans">
                {data.driverRecorded}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex flex-col gap-3">
          <h3 className="text-stone-900 text-sm font-semibold font-sans">
            Delivery timeline
          </h3>
          <div className="flex flex-col gap-1.5 pt-2">
            {data.timeline.map((step, index) => {
              const isCompleted = step.status === "completed";
              const isCurrent = step.status === "current";

              return (
                <React.Fragment key={step.id}>
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold font-sans z-10 ${
                        isCompleted
                          ? "bg-lime-500 text-white"
                          : isCurrent
                            ? "bg-neutral-50 border-2 border-lime-500 text-lime-600"
                            : "bg-neutral-50 border-2 border-neutral-200 text-stone-500"
                      }`}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`text-sm font-medium font-sans ${isCurrent ? "text-lime-700" : "text-stone-600"}`}
                      >
                        {step.title}
                      </span>
                      <span
                        className={`text-xs font-sans ${isCurrent ? "text-lime-600" : "text-stone-500"}`}
                      >
                        {step.timestamp}
                      </span>
                    </div>
                  </div>
                  {index < data.timeline.length - 1 && (
                    <div
                      className={`ml-4 w-0.5 h-8 -my-2 ${isCompleted ? "bg-lime-500" : "bg-neutral-200"}`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 border-t border-neutral-200 flex flex-col gap-3 bg-white">
        {/* Dynamic Confirmation Button */}
        <Button
          onClick={handleConfirmClick}
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-stone-900 font-semibold shadow-none transition-all"
        >
          {isReviewing
            ? `Confirm ${data.orderedQuantity} received`
            : "Review & confirm receipt"}
        </Button>

        {/* Toggle secondary actions based on state */}
        {!isReviewing ? (
          <Button
            variant="outline"
            onClick={onReportIssue}
            className="w-full text-stone-800 font-semibold shadow-none border-neutral-300"
          >
            Report an issue
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => setIsReviewing(false)}
            className="w-full text-stone-800 font-semibold shadow-none border-neutral-300"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
