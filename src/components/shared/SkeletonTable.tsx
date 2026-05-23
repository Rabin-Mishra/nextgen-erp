import React from "react";

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
}

export function SkeletonTable({ rows = 5, cols = 5 }: SkeletonTableProps) {
  return (
    <div className="w-full space-y-4 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex space-x-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={`header-col-${i}`}
            className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md"
            style={{ width: i === 0 ? "35%" : `${60 / (cols - 1)}%` }}
          />
        ))}
      </div>

      {/* Row Skeletons */}
      <div className="space-y-4 pt-2">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={`row-${r}`}
            className="flex items-center space-x-4 py-3 border-b border-zinc-50 dark:border-zinc-900 last:border-0"
          >
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={`row-${r}-col-${c}`}
                className="h-3.5 bg-zinc-100 dark:bg-zinc-900 rounded-md"
                style={{ width: c === 0 ? "30%" : `${65 / (cols - 1)}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
