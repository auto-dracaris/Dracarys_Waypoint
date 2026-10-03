import {
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

export interface OrderTableRow {
  id: string;
  requestedDate: string;
  requirement: string;
  quantity: string;
  status: string;
  statusVariant: "yellow" | "green" | "red";
}

interface OrdersTableProps {
  items: OrderTableRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function OrdersTable({ items, selectedId, onSelect }: OrdersTableProps) {
  return (
    <div className="flex-1 bg-white rounded-xl border border-neutral-200 shadow-sm flex flex-col overflow-hidden">
      {/* Header & Controls */}
      <div className="p-5 flex flex-col gap-4 border-b border-neutral-200">
        <h2 className="text-stone-900 text-2xl font-medium font-sans">
          Recent orders
        </h2>

        <div className="flex justify-between items-center mt-1">
          {/* Tabs */}
          <div className="flex p-1 bg-neutral-100 rounded-xl gap-1">
            <button className="px-3 py-1.5 bg-white rounded-lg shadow-sm text-stone-900 text-sm font-medium font-sans flex items-center gap-1.5">
              All orders <span className="text-stone-400">6</span>
            </button>
            <button className="px-3 py-1.5 text-stone-600 hover:bg-neutral-200 rounded-lg text-sm font-medium font-sans flex items-center gap-1.5">
              Awaiting scheduling <span className="text-stone-400">1</span>
            </button>
            <button className="px-3 py-1.5 text-stone-600 hover:bg-neutral-200 rounded-lg text-sm font-medium font-sans flex items-center gap-1.5">
              Deferred <span className="text-stone-400">1</span>
            </button>
          </div>

          {/* Filters & Search */}
          <div className="flex items-center gap-3">
            <button className="h-10 px-3 border border-neutral-200 rounded-lg text-stone-800 text-sm font-medium flex items-center gap-2 hover:bg-neutral-50 bg-white">
              <Filter className="w-4 h-4 text-stone-500" />
              Filter
            </button>

            <div className="relative w-64">
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
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-100 border-b border-neutral-200">
              <th className="font-medium text-stone-500 text-sm py-3 px-6 w-[20%]">
                Order ↑↓
              </th>
              <th className="font-medium text-stone-500 text-sm py-3 px-4 w-[20%]">
                Requested date ↑↓
              </th>
              <th className="font-medium text-stone-500 text-sm py-3 px-4 w-[20%]">
                Requirement ↑↓
              </th>
              <th className="font-medium text-stone-500 text-sm py-3 px-4 w-[20%]">
                Quantity ↑↓
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
              }[item.statusVariant];

              return (
                <tr
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={`border-b border-neutral-200 cursor-pointer transition-colors relative ${
                    isSelected ? "bg-yellow-50" : "hover:bg-neutral-50"
                  }`}
                >
                  <td className="py-3 px-6 text-stone-900 text-sm font-sans relative">
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-yellow-500" />
                    )}
                    {item.id}
                  </td>
                  <td className="py-3 px-4 text-stone-900 text-sm font-sans">
                    {item.requestedDate}
                  </td>
                  <td className="py-3 px-4 text-stone-900 text-sm font-sans">
                    {item.requirement}
                  </td>
                  <td className="py-3 px-4 text-stone-900 text-sm font-sans">
                    {item.quantity}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium font-sans whitespace-nowrap ${statusStyles}`}
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

      {/* Pagination Footer */}
      <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex justify-between items-center">
        <span className="text-stone-500 text-sm font-sans px-3">
          Showing 1-6 of 6 results
        </span>
        <div className="flex items-center gap-2">
          <button className="h-9 px-3 bg-white border border-neutral-200 rounded-md text-stone-800 text-sm font-medium flex items-center gap-1 hover:bg-neutral-50">
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          <div className="flex items-center gap-1">
            <button className="w-9 h-9 bg-yellow-400 rounded-md text-stone-900 text-sm font-medium flex items-center justify-center">
              1
            </button>
            <button className="w-9 h-9 bg-white border border-neutral-200 rounded-md text-stone-600 text-sm font-medium flex items-center justify-center hover:bg-neutral-50">
              2
            </button>
            <button className="w-9 h-9 bg-white border border-neutral-200 rounded-md text-stone-600 text-sm font-medium flex items-center justify-center hover:bg-neutral-50">
              3
            </button>
            <button className="w-9 h-9 bg-white border border-neutral-200 rounded-md text-stone-600 text-sm font-medium flex items-center justify-center hover:bg-neutral-50">
              4
            </button>
          </div>

          <button className="h-9 px-3 bg-white border border-neutral-200 rounded-md text-stone-800 text-sm font-medium flex items-center gap-1 hover:bg-neutral-50">
            Next <ChevronRight className="w-4 h-4" />
          </button>

          <div className="relative ml-2">
            <select className="h-9 pl-3 pr-8 bg-white border border-neutral-200 rounded-md text-stone-500 text-sm font-sans appearance-none outline-none">
              <option>6 per page</option>
            </select>
            <ChevronDown className="w-4 h-4 text-stone-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
