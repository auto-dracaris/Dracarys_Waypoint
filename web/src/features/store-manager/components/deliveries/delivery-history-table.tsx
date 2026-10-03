import { Calendar, Search } from "lucide-react";
import type { DeliveryHistoryItem } from "@/features/store-manager/types";

interface DeliveryHistoryTableProps {
  items: DeliveryHistoryItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function DeliveryHistoryTable({
  items,
  selectedId,
  onSelect,
}: DeliveryHistoryTableProps) {
  return (
    <div className="flex-2 bg-white rounded-xl border border-neutral-200 shadow-sm flex flex-col overflow-hidden">
      {/* Header & Controls */}
      <div className="p-6 flex flex-col gap-4 border-b border-neutral-200">
        <div className="flex justify-between items-center">
          <h2 className="text-stone-900 text-2xl font-medium font-sans">
            Delivery history
          </h2>
          <div className="relative w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search order ID"
              className="w-full h-10 pl-9 pr-12 rounded-lg border border-neutral-300 text-sm font-sans outline-none focus:border-yellow-400"
            />
            <div className="absolute right-2 top-2.5 px-1.5 py-0.5 bg-neutral-100 rounded text-stone-500 text-xs font-medium">
              ⌘K
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-2">
          {/* Tabs */}
          <div className="flex p-1 bg-neutral-100 rounded-xl gap-1">
            <button className="px-3 py-1.5 bg-white rounded-lg shadow-sm text-stone-900 text-sm font-medium font-sans flex gap-1.5">
              All <span className="text-stone-400">6</span>
            </button>
            <button className="px-3 py-1.5 text-stone-600 hover:bg-neutral-200 rounded-lg text-sm font-medium font-sans flex gap-1.5">
              Upcoming <span className="text-stone-400">3</span>
            </button>
            <button className="px-3 py-1.5 text-stone-600 hover:bg-neutral-200 rounded-lg text-sm font-medium font-sans flex gap-1.5">
              Awaiting confirmation <span className="text-stone-400">1</span>
            </button>
            <button className="px-3 py-1.5 text-stone-600 hover:bg-neutral-200 rounded-lg text-sm font-medium font-sans flex gap-1.5">
              Completed <span className="text-stone-400">2</span>
            </button>
          </div>

          {/* Date Filter */}
          <button className="h-9 px-3 border border-neutral-200 rounded-md text-stone-800 text-sm font-medium flex items-center gap-2 hover:bg-neutral-50">
            <Calendar className="w-4 h-4" />
            Delivery date
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-100 border-b border-neutral-200">
              <th className="font-medium text-stone-500 text-sm py-3 px-4 w-[20%]">
                Order ID ↑↓
              </th>
              <th className="font-medium text-stone-500 text-sm py-3 px-4 w-[15%]">
                Requirement ↑↓
              </th>
              <th className="font-medium text-stone-500 text-sm py-3 px-4 w-[20%]">
                Delivery date ↑↓
              </th>
              <th className="font-medium text-stone-500 text-sm py-3 px-4 w-[25%]">
                Arrival / latest update ↑↓
              </th>
              <th className="font-medium text-stone-500 text-sm py-3 px-4 w-[20%]">
                Status ↑↓
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isSelected = item.id === selectedId;
              const statusStyles = {
                yellow: "bg-yellow-100 text-yellow-700",
                green: "bg-lime-100 text-lime-700",
                red: "bg-red-100 text-red-700",
                blue: "bg-blue-100 text-blue-700",
                default: "bg-neutral-100 text-neutral-700",
              }[item.statusVariant];

              return (
                <tr
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={`border-b border-neutral-200 cursor-pointer transition-colors ${
                    isSelected ? "bg-yellow-50" : "hover:bg-neutral-50"
                  }`}
                >
                  {/* CRITICAL FIX: The yellow bar is now an absolute div inside the first td, keeping the column count at 5 */}
                  <td className="py-3 px-4 text-stone-900 text-sm font-sans relative">
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-yellow-500" />
                    )}
                    {item.id}
                  </td>

                  <td className="py-3 px-4 text-stone-900 text-sm font-sans">
                    {item.requirement}
                  </td>
                  <td className="py-3 px-4 text-stone-900 text-sm font-sans">
                    {item.deliveryDate}
                  </td>
                  <td className="py-3 px-4 text-stone-900 text-sm font-sans">
                    {item.latestUpdate}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium font-sans ${statusStyles}`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-3 bg-neutral-50 border-t border-neutral-200 text-stone-500 text-sm font-sans">
        {items.length} deliveries
      </div>
    </div>
  );
}
