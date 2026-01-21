"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PartyPopper, X } from "lucide-react";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { useDismissOnboardingMutation } from "@/lib/api/onboarding-api";

export function OnboardingCompletedBanner() {
  const t = useTranslations("onboarding");
  const { dismissOnboarding } = useOnboardingStore();
  const [dismissMutation] = useDismissOnboardingMutation();

  const handleDismiss = async () => {
    dismissOnboarding();
    await dismissMutation({ is_dismissed: true });
  };

  return (
    <Card className="border-green-500 bg-green-50 dark:bg-green-950/30">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start sm:items-center justify-between gap-2">
          <div className="flex items-start sm:items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-full bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400 flex-shrink-0">
              <PartyPopper className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-sm sm:text-base">{t("completed.title")}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t("completed.description")}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleDismiss} className="flex-shrink-0 h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
