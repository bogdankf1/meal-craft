"use client";

import { useTranslations } from "next-intl";
import { Progress } from "@/components/ui/progress";
import {
  useOnboardingStore,
  ONBOARDING_STEPS,
} from "@/lib/store/onboarding-store";

export function OnboardingProgress() {
  const t = useTranslations("onboarding");
  const { getCompletedCount } = useOnboardingStore();

  const completed = getCompletedCount();
  const total = ONBOARDING_STEPS.length;
  const percentage = Math.round((completed / total) * 100);

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Progress value={percentage} className="w-16 sm:w-24 h-2" />
      <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
        {t("progress", { completed, total })}
      </span>
    </div>
  );
}
