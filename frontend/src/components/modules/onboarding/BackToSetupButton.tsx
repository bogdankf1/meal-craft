"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check } from "lucide-react";
import {
  useOnboardingStore,
  type OnboardingStepId,
} from "@/lib/store/onboarding-store";
import { useUpdateOnboardingStepMutation } from "@/lib/api/onboarding-api";

interface BackToSetupButtonProps {
  stepId: OnboardingStepId;
}

export function BackToSetupButton({ stepId }: BackToSetupButtonProps) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { markStepCompleted, steps } = useOnboardingStore();
  const [updateStep] = useUpdateOnboardingStepMutation();

  // Only show if onboarding=true is in URL
  const isOnboarding = searchParams.get("onboarding") === "true";

  if (!isOnboarding) {
    return null;
  }

  const isStepCompleted = steps[stepId]?.status === "completed";

  const handleMarkComplete = async () => {
    markStepCompleted(stepId);
    await updateStep({ step_id: stepId, status: "completed" });
  };

  const handleBackToDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 flex flex-col sm:flex-row gap-2">
      {!isStepCompleted && (
        <Button onClick={handleMarkComplete} variant="default" size="sm" className="w-full sm:w-auto shadow-lg">
          <Check className="h-4 w-4 mr-2" />
          <span className="truncate">{t("markComplete")}</span>
        </Button>
      )}
      <Button onClick={handleBackToDashboard} variant="outline" size="sm" className="w-full sm:w-auto shadow-lg bg-background">
        <ArrowLeft className="h-4 w-4 mr-2" />
        <span className="truncate">{t("backToSetup")}</span>
      </Button>
    </div>
  );
}
