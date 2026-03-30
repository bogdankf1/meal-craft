"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-10 px-4 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-3 text-muted-foreground/50 [&>svg]:h-8 [&>svg]:w-8">
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-medium">{title}</h3>
      {description && (
        <p className="mt-1.5 text-[13px] text-muted-foreground max-w-md">
          {description}
        </p>
      )}
      {action && (
        <Button className="mt-4 rounded-xl" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
      {secondaryAction && (
        <Button
          variant="link"
          className="mt-1.5 text-[13px]"
          onClick={secondaryAction.onClick}
        >
          {secondaryAction.label}
        </Button>
      )}
    </div>
  );
}
