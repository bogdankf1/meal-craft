"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface AnalyticsCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export function AnalyticsCard({
  title,
  icon,
  children,
  className,
  fullWidth = false,
}: AnalyticsCardProps) {
  return (
    <Card className={cn("py-0 gap-0 border-0 shadow-[0_2px_12px_rgba(0,0,0,0.04)] rounded-[1.375rem]", fullWidth && "md:col-span-2", className)}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-[15px] font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">{children}</CardContent>
    </Card>
  );
}
