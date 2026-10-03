import { Button } from "@/components/ui/shadcn/button";
import { AlertTriangle } from "lucide-react";

interface DeferredOrderCardProps {
  orderTitle: string;
  reason: string;
  statusLabel?: string;
  onViewOrder?: () => void;
}

export function DeferredOrderCard({
  orderTitle,
  reason,
  statusLabel = "Needs attention",
  onViewOrder,
}: DeferredOrderCardProps) {
  return (
    <div className="w-full bg-red-50 rounded-lg border border-red-200 p-6 flex flex-col justify-between h-[210px] overflow-hidden">
      {/* Top Header Row */}
      <div className="flex justify-between items-center">
        <h4 className="text-stone-900 text-xl font-medium font-sans">
          Order deferred
        </h4>
        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-2xl text-xs font-semibold font-sans">
          {statusLabel}
        </span>
      </div>

      {/* Middle Content */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center shrink-0">
          <AlertTriangle className="h-6 w-6 text-indigo-700" />
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-stone-900 text-sm font-medium font-sans">
            {orderTitle}
          </p>
          <p className="text-stone-600 text-sm font-normal font-sans">
            {reason}
          </p>
        </div>
      </div>

      {/* Footer Action Button */}
      <div>
        <Button
          onClick={onViewOrder}
          className="w-40 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold h-9 rounded-sm flex items-center gap-2 shadow-none font-sans"
        >
          View order <span className="text-xl">→</span>
        </Button>
      </div>
    </div>
  );
}
