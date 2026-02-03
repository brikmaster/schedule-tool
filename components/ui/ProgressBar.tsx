import React from "react";

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

export default function ProgressBar({ current, total, label }: ProgressBarProps) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-sm text-[var(--ss-text)] mb-2">
          <span>{label}</span>
          <span>
            {current} / {total}
          </span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-[var(--ss-primary)] h-3 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
