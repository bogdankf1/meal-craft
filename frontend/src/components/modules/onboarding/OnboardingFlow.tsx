"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, RefreshCw } from "lucide-react";
import {
  useOnboardingStore,
  ONBOARDING_STEPS,
} from "@/lib/store/onboarding-store";
import {
  useDismissOnboardingMutation,
  useLazyGetOnboardingDerivedStatusQuery,
  useUpdateOnboardingStepMutation,
} from "@/lib/api/onboarding-api";
import { OnboardingStepCard } from "./OnboardingStepCard";
import { OnboardingProgress } from "./OnboardingProgress";
import { OnboardingCompletedBanner } from "./OnboardingCompletedBanner";

export function OnboardingFlow() {
  const t = useTranslations("onboarding");
  const {
    isDismissed,
    isAllComplete,
    isStepAccessible,
    dismissOnboarding,
    markStepCompleted,
    steps,
  } = useOnboardingStore();
  const [dismissMutation] = useDismissOnboardingMutation();
  const [triggerGetDerivedStatus, { isFetching }] =
    useLazyGetOnboardingDerivedStatusQuery();
  const [updateStep] = useUpdateOnboardingStepMutation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Don't render if dismissed
  if (isDismissed) {
    return null;
  }

  // Show completed banner if all steps are done
  if (isAllComplete()) {
    return <OnboardingCompletedBanner />;
  }

  const handleDismiss = async () => {
    dismissOnboarding();
    await dismissMutation({ is_dismissed: true });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await triggerGetDerivedStatus().unwrap();
      if (result.steps) {
        // Check each step and update if derived status shows complete
        for (const stepId of ONBOARDING_STEPS) {
          const isDerivedComplete = result.steps[stepId];
          const currentStatus = steps[stepId]?.status;

          // If derived shows complete but our state shows pending, mark as completed
          if (isDerivedComplete && currentStatus === "pending") {
            markStepCompleted(stepId);
            await updateStep({ step_id: stepId, status: "completed" });
          }
        }
      }
    } catch {
      // Silently fail
    } finally {
      setIsRefreshing(false);
    }
  };

  const loading = isFetching || isRefreshing;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-start justify-between gap-2 sm:block">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">{t("title")}</h2>
              <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>
            {/* Mobile-only action buttons */}
            <div className="flex items-center gap-1 sm:hidden flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={loading}
                title={t("refresh")}
                className="h-8 w-8"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                title={t("dismiss")}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0">
            <OnboardingProgress />
            {/* Desktop action buttons */}
            <div className="hidden sm:flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={loading}
                title={t("refresh")}
                className="h-8 w-8"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                title={t("dismiss")}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-5">
        <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
          {ONBOARDING_STEPS.map((stepId, index) => (
            <OnboardingStepCard
              key={stepId}
              stepId={stepId}
              stepNumber={index + 1}
              isAccessible={isStepAccessible(stepId)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
