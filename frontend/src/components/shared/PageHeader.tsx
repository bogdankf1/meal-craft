"use client";

import { cn } from "@/lib/utils";
import { useUserStore } from "@/lib/store/user-store";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  const { preferences } = useUserStore();
  const { showPageTitle, showPageSubtitle } = preferences.uiVisibility;

  // If both title and subtitle are hidden and no actions, render nothing
  if (!showPageTitle && !showPageSubtitle && !actions) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6",
        className
      )}
    >
      <div>
        {showPageTitle && (
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        )}
        {showPageSubtitle && description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
