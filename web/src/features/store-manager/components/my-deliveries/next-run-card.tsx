import { Button } from "@/components/ui/shadcn/button";
import { Calendar } from "lucide-react";

interface NextRunCardProps {
  title?: string;
  dateLabel: string; // e.g., "Wednesday, 30 September"
  cutoffTime: string; // e.g., "Today at 16:00"
  onPlaceOrder?: () => void;
}

export function NextRunCard({
  title = "Order for the next run",
  dateLabel,
  cutoffTime,
  onPlaceOrder,
}: NextRunCardProps) {
  return (
    <div className="w-full bg-white rounded-lg border border-neutral-300 flex flex-col overflow-hidden">
      {/* Top Header Section */}
      <div className="px-6 py-5">
        <h3 className="text-stone-900 text-4xl font-medium font-sans">
          {title}
        </h3>
      </div>

      {/* Divider line */}
      <div className="self-stretch h-px bg-neutral-200" />

      {/* Card Content Body */}
      <div className="p-6 flex flex-col justify-between gap-6 flex-1">
        {/* Top Content */}
        <div className="flex gap-4 items-start">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center shrink-0 text-stone-700">
            <Calendar className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-1">
            <h4 className="text-stone-900 text-base font-semibold font-sans">
              {dateLabel}
            </h4>
            <p className="text-stone-500 text-sm font-normal font-sans">
              Order cutoff: {cutoffTime}
            </p>
            <p className="text-stone-400 text-xs font-normal pt-1 font-sans">
              Orders submitted after cutoff move to the following eligible run.
            </p>
          </div>
        </div>

        {/* Bottom Button */}
        <Button
          onClick={onPlaceOrder}
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-stone-900 font-medium text-base h-10 rounded-sm shadow-none font-sans"
        >
          Place order
        </Button>
      </div>
    </div>
  );
}
