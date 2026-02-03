"use client";

import { Check, AlertTriangle, X, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type AvailabilityStatus = "available" | "partial" | "unavailable" | "unknown";

interface AvailabilityBadgeProps {
  status: AvailabilityStatus;
  missingCount?: number;
  partialCount?: number;
  availableServings?: number;
  totalIngredients?: number;
  compact?: boolean;
  showTooltip?: boolean;
  className?: string;
}

const statusConfig: Record<
  AvailabilityStatus,
  {
    icon: typeof Check;
    label: string;
    className: string;
    tooltipText: string;
  }
> = {
  available: {
    icon: Check,
    label: "Can make",
    className: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-800",
    tooltipText: "All ingredients available in pantry",
  },
  partial: {
    icon: AlertTriangle,
    label: "Partial",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
    tooltipText: "Some ingredients missing",
  },
  unavailable: {
    icon: X,
    label: "Missing",
    className: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-800",
    tooltipText: "Many ingredients missing",
  },
  unknown: {
    icon: Package,
    label: "Unknown",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700",
    tooltipText: "Availability not checked",
  },
};

export function AvailabilityBadge({
  status,
  missingCount,
  partialCount,
  availableServings,
  totalIngredients,
  compact = false,
  showTooltip = true,
  className,
}: AvailabilityBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  // Build detailed tooltip text
  let tooltipText = config.tooltipText;
  if (status !== "unknown") {
    const details: string[] = [];
    if (missingCount !== undefined && missingCount > 0) {
      details.push(`${missingCount} missing`);
    }
    if (partialCount !== undefined && partialCount > 0) {
      details.push(`${partialCount} partial`);
    }
    if (availableServings !== undefined && availableServings > 0) {
      details.push(`Can make ${availableServings} servings`);
    }
    if (details.length > 0) {
      tooltipText = details.join(" · ");
    }
  }

  const badge = (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      <Icon className="h-3 w-3" />
      {!compact && (
        <span>
          {status === "partial" && missingCount !== undefined
            ? `${missingCount}/${totalIngredients || "?"} missing`
            : config.label}
        </span>
      )}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Helper function to determine availability status from counts
 */
export function getAvailabilityStatus(
  canMake: boolean,
  missingCount: number,
  partialCount: number,
  totalIngredients: number
): AvailabilityStatus {
  if (canMake && missingCount === 0 && partialCount === 0) {
    return "available";
  }
  if (missingCount === 0 && partialCount > 0) {
    return "partial";
  }
  if (missingCount > 0 && missingCount < totalIngredients) {
    return "partial";
  }
  if (missingCount === totalIngredients || missingCount > totalIngredients / 2) {
    return "unavailable";
  }
  return "partial";
}
