"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Check,
  SkipForward,
  Users,
  ShoppingCart,
  Package,
  Target,
  ChefHat,
  Calendar,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useOnboardingStore,
  type OnboardingStepId,
} from "@/lib/store/onboarding-store";

interface OnboardingStepCardProps {
  stepId: OnboardingStepId;
  stepNumber: number;
  isAccessible: boolean;
}

const stepConfig: Record<
  OnboardingStepId,
  { icon: React.ElementType; route: string; canSkip: boolean }
> = {
  household: { icon: Users, route: "/settings?tab=household&onboarding=true", canSkip: false },
  groceries: { icon: ShoppingCart, route: "/groceries?tab=import&onboarding=true", canSkip: true },
  pantry: { icon: Package, route: "/groceries?onboarding=true&selectAll=true", canSkip: true },
  nutrition: { icon: Target, route: "/nutrition?tab=goals&onboarding=true", canSkip: true },
  recipes: { icon: ChefHat, route: "/recipes?onboarding=true&openAiSuggestions=true", canSkip: true },
  meal_plan: { icon: Calendar, route: "/meal-planner?onboarding=true", canSkip: true },
};

export function OnboardingStepCard({
  stepId,
  stepNumber,
  isAccessible,
}: OnboardingStepCardProps) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const { steps, markStepSkipped } = useOnboardingStore();

  const step = steps[stepId];
  const config = stepConfig[stepId];
  const Icon = config.icon;

  const isCompleted = step.status === "completed";
  const isSkipped = step.status === "skipped";
  const isPending = step.status === "pending";
  const isLocked = isPending && !isAccessible;
  const isActive = isPending && isAccessible;

  const handleStart = () => {
    router.push(config.route);
  };

  const handleSkip = () => {
    markStepSkipped(stepId);
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200",
        isCompleted && "border-green-500 bg-green-50/50 dark:bg-green-950/20",
        isSkipped && "border-muted-foreground/30 bg-muted/20",
        isActive && "border-primary shadow-sm",
        isLocked && "opacity-50 border-dashed"
      )}
    >
      {/* Step number indicator */}
      <div
        className={cn(
          "absolute top-2 left-2 sm:top-3 sm:left-3 h-5 w-5 rounded-full flex items-center justify-center text-xs font-medium",
          isCompleted && "bg-green-500 text-white",
          isSkipped && "bg-muted-foreground/30 text-muted-foreground",
          isActive && "bg-primary text-primary-foreground",
          isLocked && "bg-muted text-muted-foreground"
        )}
      >
        {isCompleted ? <Check className="h-3 w-3" /> : stepNumber}
      </div>

      {/* Skipped badge */}
      {isSkipped && (
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
          <span className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">
            {t("skipped")}
          </span>
        </div>
      )}

      {/* Main content */}
      <div className="pt-8 sm:pt-10 pb-3 sm:pb-4 px-2 sm:px-4">
        {/* Icon */}
        <div
          className={cn(
            "mx-auto w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mb-2 sm:mb-3",
            isCompleted && "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400",
            isSkipped && "bg-muted text-muted-foreground",
            isActive && "bg-primary/10 text-primary",
            isLocked && "bg-muted/50 text-muted-foreground"
          )}
        >
          {isLocked ? <Lock className="h-4 w-4 sm:h-5 sm:w-5" /> : <Icon className="h-4 w-4 sm:h-5 sm:w-5" />}
        </div>

        {/* Title */}
        <h3 className="font-medium text-xs sm:text-sm text-center mb-1 leading-tight">
          {t(`steps.${stepId}.title`)}
        </h3>

        {/* Description - hidden on locked cards and on very small screens */}
        {!isLocked && (
          <p className="hidden sm:block text-[11px] text-muted-foreground text-center leading-snug mb-3 line-clamp-2 min-h-[2.5em]">
            {t(`steps.${stepId}.description`)}
          </p>
        )}

        {/* Locked message */}
        {isLocked && (
          <p className="text-[10px] sm:text-[11px] text-muted-foreground text-center mb-2 sm:mb-3">
            {t("completePrevious")}
          </p>
        )}

        {/* Action buttons */}
        {isActive && (
          <div className="space-y-1 sm:space-y-1.5 mt-2 sm:mt-0">
            <Button size="sm" onClick={handleStart} className="w-full h-7 sm:h-8 text-[11px] sm:text-xs">
              {t("start")}
            </Button>
            {config.canSkip && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSkip}
                className="w-full h-6 sm:h-7 text-[10px] sm:text-[11px] text-muted-foreground hover:text-foreground"
              >
                <SkipForward className="h-3 w-3 mr-1" />
                {t("skip")}
              </Button>
            )}
          </div>
        )}

        {/* Completed/Skipped action */}
        {(isCompleted || isSkipped) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleStart}
            className="w-full h-6 sm:h-7 text-[10px] sm:text-[11px] text-muted-foreground hover:text-foreground mt-2 sm:mt-0"
          >
            {isCompleted ? t("viewAgain") : t("doNow")}
          </Button>
        )}
      </div>
    </Card>
  );
}
