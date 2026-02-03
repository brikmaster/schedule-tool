import React from "react";

interface SkeletonLoaderProps {
  count?: number;
  height?: string;
}

export default function SkeletonLoader({ count = 1, height = "h-4" }: SkeletonLoaderProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${height} bg-gray-200 rounded animate-pulse`}
        />
      ))}
    </div>
  );
}
