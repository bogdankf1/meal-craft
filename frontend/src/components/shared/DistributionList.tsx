"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface DistributionItem {
  key: string;
  label: string;
  value: number;
  formattedValue?: string;
  percentage?: number;
}

export interface DistributionListProps {
  items: DistributionItem[];
  maxItems?: number;
  showPercentage?: boolean;
  formatValue?: (value: number) => string;
  formatLabel?: (key: string) => string;
  valueLabel?: string;
  emptyMessage?: string;
  className?: string;
}

export function DistributionList({
  items,
  maxItems = 6,
  showPercentage = false,
  formatValue,
  formatLabel,
  valueLabel = "",
  emptyMessage = "No data available",
  className,
}: DistributionListProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        {emptyMessage}
      </p>
    );
  }

  // Sort by value descending and limit
  const sortedItems = [...items]
    .sort((a, b) => b.value - a.value)
    .slice(0, maxItems);

  const maxValue = Math.max(...sortedItems.map((item) => item.value));
  const totalValue = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={cn("space-y-3", className)}>
      {sortedItems.map((item) => {
        const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        const sharePercentage = totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0;

        return (
          <div key={item.key}>
            <div className="flex justify-between text-sm mb-1">
              <span className="capitalize">
                {formatLabel ? formatLabel(item.key) : item.label}
              </span>
              <span className={showPercentage ? "font-medium" : "text-muted-foreground"}>
                {item.formattedValue || (formatValue ? formatValue(item.value) : item.value)}
                {valueLabel && ` ${valueLabel}`}
                {showPercentage && (
                  <span className="text-muted-foreground font-normal">
                    {" "}({sharePercentage}%)
                  </span>
                )}
              </span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>
        );
      })}
    </div>
  );
}
