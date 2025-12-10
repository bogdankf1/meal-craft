"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ViewOption {
  /** Unique identifier for the view */
  value: string;
  /** Display label for the view */
  label: string;
  /** Icon to display */
  icon: ReactNode;
}

export interface ViewSelectorProps {
  /** Currently selected view */
  currentView: string;
  /** Callback when view changes */
  onViewChange: (view: string) => void;
  /** Available view options */
  views: ViewOption[];
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "default";
  /** Show labels alongside icons */
  showLabels?: boolean;
}

/**
 * Reusable ViewSelector component for switching between different view modes.
 * Supports table, calendar, grid, and other view types.
 * Designed to be extensible for future view modes.
 */
export function ViewSelector({
  currentView,
  onViewChange,
  views,
  className,
  size = "default",
  showLabels = false,
}: ViewSelectorProps) {
  // Match the height of other filter elements (h-9 = 36px)
  const containerHeight = size === "sm" ? "h-8" : "h-9";
  const buttonSize = size === "sm" ? "h-6 w-6" : "h-7 w-7";
  const iconSize = "h-4 w-4";

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "inline-flex items-center rounded-md border bg-muted px-1 gap-1",
          containerHeight,
          className
        )}
        role="tablist"
        aria-label="View selector"
      >
        {views.map((view) => {
          const isActive = currentView === view.value;

          return (
            <Tooltip key={view.value}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="icon"
                  className={cn(
                    buttonSize,
                    !isActive && "hover:bg-background/80",
                    showLabels && "w-auto px-2"
                  )}
                  onClick={() => onViewChange(view.value)}
                  role="tab"
                  aria-selected={isActive}
                  aria-label={view.label}
                >
                  <span className={iconSize}>{view.icon}</span>
                  {showLabels && (
                    <span className="ml-1.5 text-sm">{view.label}</span>
                  )}
                </Button>
              </TooltipTrigger>
              {!showLabels && (
                <TooltipContent side="bottom" sideOffset={5}>
                  <p>{view.label}</p>
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

// Pre-defined view options for common use cases
export const TABLE_VIEW: ViewOption = {
  value: "table",
  label: "Table",
  icon: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-full w-full"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <line x1="3" x2="21" y1="9" y2="9" />
      <line x1="3" x2="21" y1="15" y2="15" />
      <line x1="9" x2="9" y1="3" y2="21" />
    </svg>
  ),
};

export const CALENDAR_VIEW: ViewOption = {
  value: "calendar",
  label: "Calendar",
  icon: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-full w-full"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  ),
};

export const GRID_VIEW: ViewOption = {
  value: "grid",
  label: "Grid",
  icon: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-full w-full"
    >
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  ),
};

export const LIST_VIEW: ViewOption = {
  value: "list",
  label: "List",
  icon: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-full w-full"
    >
      <line x1="8" x2="21" y1="6" y2="6" />
      <line x1="8" x2="21" y1="12" y2="12" />
      <line x1="8" x2="21" y1="18" y2="18" />
      <line x1="3" x2="3.01" y1="6" y2="6" />
      <line x1="3" x2="3.01" y1="12" y2="12" />
      <line x1="3" x2="3.01" y1="18" y2="18" />
    </svg>
  ),
};
