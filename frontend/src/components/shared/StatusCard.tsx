"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatusVariant = "danger" | "warning" | "success" | "info" | "muted";

export interface StatusCardProps {
  icon: ReactNode;
  value: number | string;
  label: string;
  variant?: StatusVariant;
  className?: string;
}

const variantStyles: Record<StatusVariant, {
  container: string;
  iconWrapper: string;
  text: string;
}> = {
  danger: {
    container: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900",
    iconWrapper: "bg-red-100 dark:bg-red-900",
    text: "text-red-600 dark:text-red-400",
  },
  warning: {
    container: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900",
    iconWrapper: "bg-orange-100 dark:bg-orange-900",
    text: "text-orange-600 dark:text-orange-400",
  },
  success: {
    container: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900",
    iconWrapper: "bg-green-100 dark:bg-green-900",
    text: "text-green-600 dark:text-green-400",
  },
  info: {
    container: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900",
    iconWrapper: "bg-blue-100 dark:bg-blue-900",
    text: "text-blue-600 dark:text-blue-400",
  },
  muted: {
    container: "bg-muted/50 border-border",
    iconWrapper: "bg-muted",
    text: "text-muted-foreground",
  },
};

export function StatusCard({
  icon,
  value,
  label,
  variant = "muted",
  className,
}: StatusCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border",
        styles.container,
        className
      )}
    >
      <div className={cn("p-2 rounded-full", styles.iconWrapper)}>
        <div className={styles.text}>{icon}</div>
      </div>
      <div>
        <p className={cn("text-2xl font-bold", styles.text)}>{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// Grid wrapper for multiple status cards
export interface StatusCardGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatusCardGrid({
  children,
  columns = 3,
  className,
}: StatusCardGridProps) {
  const colsClass = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", colsClass[columns], className)}>
      {children}
    </div>
  );
}
