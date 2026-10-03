import React from "react";

interface MetricsSummaryCardProps {
  icon: React.ReactNode;
  title: string;
  value: number | string;
  isWarning?: boolean;
}

export function SummaryCard({
  icon,
  title,
  value,
  isWarning = false,
}: MetricsSummaryCardProps) {
  return (
    <div
      className={`flex-1 px-4 py-2.5 rounded-md outline outline-1 outline-offset-[-1px] outline-stone-200/50 inline-flex flex-col justify-start items-end gap-1 ${
        isWarning ? "bg-yellow-50" : "bg-white"
      }`}
    >
      <div className="self-stretch inline-flex justify-between items-center overflow-hidden">
        <span
          className={`flex items-center justify-center ${
            isWarning ? "text-yellow-600" : "text-stone-600"
          }`}
        >
          {/* Render the icon component directly */}
          {icon}
        </span>
        <span className="justify-start text-stone-600 text-base ">{title}</span>
      </div>
      <div className="justify-start text-stone-900 text-6xl font-semibold ">
        {value}
      </div>
    </div>
  );
}
