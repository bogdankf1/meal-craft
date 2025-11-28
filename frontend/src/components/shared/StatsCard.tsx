"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
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
  trend,
  variant = "default",
  className,
}: StatsCardProps) {
  return (
    <Card className={cn("py-0 gap-0", variantStyles[variant], className)}>
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
          {icon && (
            <div className="p-1.5 rounded-lg bg-background/50">{icon}</div>
          )}
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1 text-sm">
            {trend.direction === "up" && (
              <TrendingUp className="h-4 w-4 text-green-500" />
            )}
            {trend.direction === "down" && (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span
              className={cn(
                trend.direction === "up" && "text-green-600",
                trend.direction === "down" && "text-red-600"
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
