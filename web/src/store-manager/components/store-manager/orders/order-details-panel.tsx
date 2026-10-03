import { Check, Package, ArrowRight } from "lucide-react";
import { Button } from "@/store-manager/components/ui/button";

export interface OrderDetailsData {
  id: string;
  location: string;
  status: string;
  statusVariant: "yellow" | "green" | "red";
  timelineStatus: string;
  timelineTime: string;
  timelineMessage: string;
  requestedDelivery: string;
  requirement: string;
  quantity: string;
  totalWeight: string;
  totalVolume: string;
  receivingWindow: string;
  arrivalTime: string;
}

interface OrderDetailsPanelProps {
  data: OrderDetailsData | null;
}

export function OrderDetailsPanel({ data }: OrderDetailsPanelProps) {
  if (!data)
    return (
      <div className="w-[420px] p-6 bg-white rounded-xl border border-neutral-200">
        Select an order...
      </div>
    );

  const statusStyles = {
    yellow: "bg-yellow-100 text-yellow-700",
    green: "bg-lime-100 text-lime-700",
    red: "bg-red-100 text-red-700",
  }[data.statusVariant];

  return (
    <div className="w-[420px] shrink-0 bg-white rounded-xl border border-neutral-200 shadow-sm flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-neutral-200 flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h2 className="text-stone-900 text-3xl font-medium font-sans">
            {data.id}
          </h2>
          <p className="text-stone-500 text-sm font-sans">{data.location}</p>
        </div>
        <div
          className={`px-2.5 py-1 rounded-full text-xs font-medium font-sans flex items-center gap-1.5 ${statusStyles}`}
        >
          <span className="text-xs">🕒</span>{" "}
          {/* Replace with Lucide Clock if preferred */}
          {data.status}
        </div>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Order Status Timeline Alert */}
        <div className="p-6 border-b border-neutral-200 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-lime-100 rounded-full flex items-center justify-center shrink-0">
              <div className="w-5 h-5 bg-lime-500 rounded-full flex items-center justify-center text-white">
                <Check className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-stone-900 text-sm font-semibold font-sans">
                {data.timelineStatus}
              </span>
              <span className="text-stone-500 text-xs font-sans">
                {data.timelineTime}
              </span>
            </div>
          </div>
          <p className="text-stone-500 text-sm font-sans leading-relaxed">
            {data.timelineMessage}
          </p>
        </div>

        {/* Order Details List */}
        <div className="p-6 border-b border-neutral-200 flex flex-col gap-4">
          <h3 className="text-stone-900 text-base font-semibold font-sans">
            Order details
          </h3>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-stone-500 text-sm font-sans w-40">
                Requested delivery
              </span>
              <span className="text-stone-900 text-sm font-semibold font-sans flex-1">
                {data.requestedDelivery}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-500 text-sm font-sans w-40">
                Requirement
              </span>
              <span className="text-stone-900 text-sm font-semibold font-sans flex items-center gap-2 flex-1">
                <Package className="w-4 h-4 text-stone-700" />
                {data.requirement}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-500 text-sm font-sans w-40">
                Quantity
              </span>
              <span className="text-stone-900 text-sm font-semibold font-sans flex-1">
                {data.quantity}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-500 text-sm font-sans w-40">
                Total weight
              </span>
              <span className="text-stone-900 text-sm font-semibold font-sans flex-1">
                {data.totalWeight}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-500 text-sm font-sans w-40">
                Total volume
              </span>
              <span className="text-stone-900 text-sm font-semibold font-sans flex-1">
                {data.totalVolume}
              </span>
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="p-6 flex flex-col gap-4">
          <h3 className="text-stone-900 text-base font-semibold font-sans">
            Delivery
          </h3>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-stone-500 text-sm font-sans w-40">
                Receiving window
              </span>
              <span className="text-stone-900 text-sm font-semibold font-sans flex-1">
                {data.receivingWindow}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-500 text-sm font-sans w-40">
                Arrival time
              </span>
              <span className="text-stone-900 text-sm font-semibold font-sans flex-1">
                {data.arrivalTime}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="p-6 pt-0 bg-white">
        <Button
          variant="outline"
          className="w-full h-10 border-neutral-300 text-stone-900 font-semibold shadow-none flex gap-2"
        >
          View full order <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
