import React from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

export default function LoadingSpinner({ size = "md", label }: LoadingSpinnerProps) {
  const sizeClass = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  }[size];

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeClass} border-3 border-[var(--ss-primary)] border-t-transparent rounded-full animate-spin`}
      />
      {label && (
        <p className="text-sm text-[var(--ss-text-light)]">{label}</p>
      )}
    </div>
  );
}
