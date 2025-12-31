"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Tab {
  value: string;
  label: string;
  icon?: React.ReactNode;
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
      <TabsList className="w-full justify-start h-auto bg-transparent p-0 mb-6 border-b border-border rounded-none gap-0 overflow-x-auto overflow-y-hidden scrollbar-hide flex-nowrap">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "relative px-3 sm:px-4 py-2.5 sm:py-3 rounded-none border-none whitespace-nowrap shrink-0",
              "bg-transparent data-[state=active]:bg-transparent",
              "text-muted-foreground hover:text-foreground transition-colors",
              "data-[state=active]:text-foreground data-[state=active]:shadow-none",
              "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5",
              "after:bg-transparent data-[state=active]:after:bg-foreground",
              "dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-none",
              "text-sm sm:text-base"
            )}
          >
            {tab.icon && <span className="mr-1.5 sm:mr-2">{tab.icon}</span>}
            <span className="hidden xs:inline sm:inline">{tab.label}</span>
            <span className="xs:hidden">{tab.icon ? "" : tab.label}</span>
            {tab.badge !== undefined && (
              <Badge variant="secondary" className="ml-1.5 sm:ml-2 text-xs">
                {tab.badge}
              </Badge>
            )}
            {tab.tierRequired && (
              <Badge
                variant="outline"
                className="ml-1.5 sm:ml-2 text-xs text-muted-foreground hidden sm:inline-flex"
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
