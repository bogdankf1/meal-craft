"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

type Tier = "HOME_COOK" | "CHEFS_CHOICE" | "MASTER_CHEF";

interface FeatureGateProps {
  requiredTier: "PLUS" | "PRO";
  currentTier?: Tier;
  children: React.ReactNode;
  featureName?: string;
}

const tierHierarchy: Record<Tier, number> = {
  HOME_COOK: 0,
  CHEFS_CHOICE: 1,
  MASTER_CHEF: 2,
};

const requiredTierMap: Record<"PLUS" | "PRO", Tier> = {
  PLUS: "CHEFS_CHOICE",
  PRO: "MASTER_CHEF",
};

export function FeatureGate({
  requiredTier,
  currentTier = "HOME_COOK",
  children,
  featureName,
}: FeatureGateProps) {
  const requiredTierValue = tierHierarchy[requiredTierMap[requiredTier]];
  const currentTierValue = tierHierarchy[currentTier];
  const hasAccess = currentTierValue >= requiredTierValue;

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 p-3 rounded-full bg-muted">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          {featureName || "This feature"} requires {requiredTier}
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          Upgrade your subscription to access this feature and unlock more
          powerful tools for your meal planning journey.
        </p>
        <Button>Upgrade to {requiredTier}</Button>
      </CardContent>
    </Card>
  );
}
