"use client";

import { useTranslations } from "next-intl";
import { ModuleTabs, TabsContent } from "@/components/shared/ModuleTabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatsCard } from "@/components/shared/StatsCard";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { Carrot, ShoppingCart, AlertTriangle, DollarSign } from "lucide-react";

export function GroceriesContent() {
  const t = useTranslations("common");

  const tabs = [
    { value: "overview", label: "Overview" },
    { value: "add", label: "Add Groceries" },
    { value: "inventory", label: "Inventory", tierRequired: "PRO" as const },
    { value: "history", label: "History" },
    { value: "analysis", label: "Analysis" },
  ];

  return (
    <ModuleTabs tabs={tabs} defaultTab="overview">
      <TabsContent value="overview">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatsCard
            title="Items Added This Week"
            value="0"
            icon={<ShoppingCart className="h-5 w-5 text-primary" />}
          />
          <StatsCard
            title="Current Inventory"
            value="0"
            icon={<Carrot className="h-5 w-5 text-primary" />}
          />
          <StatsCard
            title="Expiring Soon"
            value="0"
            icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
            variant="warning"
          />
          <StatsCard
            title="Total Value"
            value="$0.00"
            icon={<DollarSign className="h-5 w-5 text-green-500" />}
            variant="success"
          />
        </div>

        <EmptyState
          icon={<Carrot />}
          title="No groceries added yet"
          description="Add your first grocery items by typing them in, uploading a photo, or scanning a receipt!"
          action={{
            label: "Add Groceries",
            onClick: () => {},
          }}
          secondaryAction={{
            label: "See how it works",
            onClick: () => {},
          }}
        />
      </TabsContent>

      <TabsContent value="add">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold mb-4">Add Groceries</h2>
          <p className="text-muted-foreground mb-6">
            Coming soon: Add groceries via text input, photo upload, or receipt
            scanning.
          </p>
        </div>
      </TabsContent>

      <TabsContent value="inventory">
        <FeatureGate requiredTier="PRO" featureName="Inventory management">
          <div>Inventory content will go here</div>
        </FeatureGate>
      </TabsContent>

      <TabsContent value="history">
        <EmptyState
          icon={<ShoppingCart />}
          title="No history yet"
          description="Your grocery purchase history will appear here once you start adding items."
        />
      </TabsContent>

      <TabsContent value="analysis">
        <EmptyState
          icon={<Carrot />}
          title="No data for analysis"
          description="Start adding groceries to see spending patterns, shopping habits, and more."
        />
      </TabsContent>
    </ModuleTabs>
  );
}
