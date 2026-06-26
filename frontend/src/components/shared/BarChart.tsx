"use client";

import { cn } from "@/lib/utils";

export interface BarChartDataPoint {
  key: string;
  value: number;
  label: string;
}

export interface BarChartProps {
  data: BarChartDataPoint[];
  formatValue?: (value: number) => string;
  color?: string;
  height?: number;
  className?: string;
  emptyMessage?: string;
}

export function BarChart({
  data,
  formatValue = (v) => v.toString(),
  color = "bg-blue-500",
  height = 80,
  className,
  emptyMessage = "No data available",
}: BarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-sm text-muted-foreground">{emptyMessage}</span>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className={cn("flex gap-3", className)}>
      {data.map((item) => {
        const heightPx = maxValue > 0 ? Math.round((item.value / maxValue) * height) : 0;
        return (
          <div key={item.key} className="flex-1 flex flex-col items-center gap-2">
            <span className="text-sm font-semibold">{formatValue(item.value)}</span>
            <div
              className="w-full flex items-end px-1"
              style={{ height: `${height}px` }}
            >
              <div
                className={cn("w-full rounded-t transition-all", color)}
                style={{
                  height: `${heightPx}px`,
                  minHeight: item.value > 0 ? "4px" : "0",
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
