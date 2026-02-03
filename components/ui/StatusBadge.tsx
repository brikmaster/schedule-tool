import React from "react";

interface StatusBadgeProps {
  status: "ready" | "ambiguous" | "error" | "created" | "duplicate" | "failed";
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    ready: {
      color: "var(--ss-success)",
      bg: "bg-green-50",
      border: "border-green-200",
      text: "✓ Ready",
    },
    ambiguous: {
      color: "var(--ss-warning)",
      bg: "bg-orange-50",
      border: "border-orange-200",
      text: "Ambiguous",
    },
    error: {
      color: "var(--ss-error)",
      bg: "bg-red-50",
      border: "border-red-200",
      text: "Error",
    },
    created: {
      color: "var(--ss-success)",
      bg: "bg-green-50",
      border: "border-green-200",
      text: "Created",
    },
    duplicate: {
      color: "var(--ss-warning)",
      bg: "bg-orange-50",
      border: "border-orange-200",
      text: "Duplicate",
    },
    failed: {
      color: "var(--ss-error)",
      bg: "bg-red-50",
      border: "border-red-200",
      text: "Failed",
    },
  };

  const { color, bg, border, text } = config[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${bg} ${border} border`}
      style={{ color }}
    >
      {text}
    </span>
  );
}
