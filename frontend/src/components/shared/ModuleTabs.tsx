"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Tab {
  value: string;
  label: string;
  badge?: number | string;
  tierRequired?: "PLUS" | "PRO";
}

interface ModuleTabsProps {
  tabs: Tab[];
  defaultTab?: string;
  children: React.ReactNode;
  className?: string;
}

export function ModuleTabs({
  tabs,
  defaultTab,
  children,
  className,
}: ModuleTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentTab = searchParams.get("tab") || defaultTab || tabs[0]?.value;

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Tabs
      value={currentTab}
      onValueChange={handleTabChange}
      className={cn("w-full", className)}
    >
      <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-transparent p-0 mb-6">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "data-[state=active]:bg-background data-[state=active]:shadow-sm",
              "px-4 py-2 rounded-lg border border-transparent",
              "data-[state=active]:border-border"
            )}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {tab.badge}
              </Badge>
            )}
            {tab.tierRequired && (
              <Badge
                variant="outline"
                className="ml-2 text-xs text-muted-foreground"
              >
                {tab.tierRequired}
              </Badge>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}

export { TabsContent };
