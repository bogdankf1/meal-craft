"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface TopItem {
  key: string;
  name: string;
  primaryValue: number;
  primaryLabel: string;
  secondaryInfo?: { label: string; value: string }[];
}

export interface TopItemsListProps {
  items: TopItem[];
  maxItems?: number;
  showRanking?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function TopItemsList({
  items,
  maxItems = 8,
  showRanking = true,
  emptyMessage = "No data available",
  className,
}: TopItemsListProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {emptyMessage}
      </p>
    );
  }

  const displayItems = items.slice(0, maxItems);
  const maxValue = displayItems[0]?.primaryValue || 1;

  return (
    <div className={cn("space-y-3", className)}>
      {displayItems.map((item, index) => {
        const percentage = (item.primaryValue / maxValue) * 100;

        return (
          <div key={item.key}>
            <div className="flex justify-between items-start mb-1">
              <div className="flex items-center gap-2">
                {showRanking && (
                  <span className="text-sm font-medium text-muted-foreground w-5">
                    {index + 1}.
                  </span>
                )}
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {item.primaryValue} {item.primaryLabel}
              </span>
            </div>
            <Progress value={percentage} className="h-1.5" />
            {item.secondaryInfo && item.secondaryInfo.length > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                {item.secondaryInfo.map((info, i) => (
                  <span key={i}>
                    {info.value} {info.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
