"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  description?: string;
  trend?: {
    value: number | string;
    label: string;
    direction?: "up" | "down" | "neutral";
  };
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const variantStyles = {
  default: "bg-card",
  success: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900",
  warning: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900",
  danger: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900",
  info: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900",
};

export function StatsCard({
  title,
  value,
  icon,
  description,
  trend,
  variant = "default",
  className,
}: StatsCardProps) {
  return (
    <Card className={cn("py-0 gap-0 border-0 shadow-[0_2px_12px_rgba(0,0,0,0.04)] rounded-[1.375rem]", variantStyles[variant], className)}>
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-lg font-medium">{value}</p>
            {description && (
              <p className="text-[11px] text-muted-foreground">{description}</p>
            )}
          </div>
          {icon && (
            <div className="h-9 w-9 rounded-xl bg-[var(--green-ghost)] flex items-center justify-center shrink-0">{icon}</div>
          )}
        </div>
        {trend && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            {trend.direction === "up" && (
              <TrendingUp className="h-3 w-3 text-primary" />
            )}
            {trend.direction === "down" && (
              <TrendingDown className="h-3 w-3 text-destructive" />
            )}
            <span
              className={cn(
                trend.direction === "up" && "text-primary",
                trend.direction === "down" && "text-destructive"
              )}
            >
              {trend.value}
            </span>
            <span className="text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
