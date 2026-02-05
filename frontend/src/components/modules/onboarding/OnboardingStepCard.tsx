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
      {/* Mobile horizontal layout (< sm) */}
      <div className="sm:hidden flex items-center gap-2 p-2">
        {/* Step number */}
        <div
          className={cn(
            "flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-medium",
            isCompleted && "bg-green-500 text-white",
            isSkipped && "bg-muted-foreground/30 text-muted-foreground",
            isActive && "bg-primary text-primary-foreground",
            isLocked && "bg-muted text-muted-foreground"
          )}
        >
          {isCompleted ? <Check className="h-2.5 w-2.5" /> : stepNumber}
        </div>

        {/* Icon */}
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
            isCompleted && "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400",
            isSkipped && "bg-muted text-muted-foreground",
            isActive && "bg-primary/10 text-primary",
            isLocked && "bg-muted/50 text-muted-foreground"
          )}
        >
          {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
        </div>

        {/* Title & Status */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-xs leading-tight truncate">
            {t(`steps.${stepId}.title`)}
          </h3>
          {isLocked && (
            <p className="text-[10px] text-muted-foreground">{t("completePrevious")}</p>
          )}
          {isSkipped && (
            <p className="text-[10px] text-muted-foreground">{t("skipped")}</p>
          )}
          {isCompleted && (
            <p className="text-[10px] text-green-600 dark:text-green-400">{t("stepCompleted")}</p>
          )}
        </div>

        {/* Action button */}
        <div className="flex-shrink-0">
          {isActive && (
            <div className="flex items-center gap-0.5">
              <Button size="sm" onClick={handleStart} className="h-7 text-[11px] px-2.5">
                {t("start")}
              </Button>
              {config.canSkip && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSkip}
                  className="h-7 w-7 text-muted-foreground"
                  title={t("skip")}
                >
                  <SkipForward className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
          {(isCompleted || isSkipped) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleStart}
              className="h-7 text-[11px] text-muted-foreground px-2"
            >
              {isCompleted ? t("viewAgain") : t("doNow")}
            </Button>
          )}
        </div>
      </div>

      {/* Tablet/Desktop vertical layout (>= sm) */}
      <div className="hidden sm:block">
        {/* Step number indicator */}
        <div
          className={cn(
            "absolute top-3 left-3 lg:top-3 lg:left-3 h-6 w-6 lg:h-5 lg:w-5 rounded-full flex items-center justify-center text-xs font-medium",
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
          <div className="absolute top-3 right-3">
            <span className="text-[10px] lg:text-[10px] text-muted-foreground uppercase tracking-wide">
              {t("skipped")}
            </span>
          </div>
        )}

        {/* Main content */}
        <div className="pt-12 pb-5 px-4 lg:pt-10 lg:pb-4">
          {/* Icon */}
          <div
            className={cn(
              "mx-auto w-12 h-12 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center mb-3",
              isCompleted && "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400",
              isSkipped && "bg-muted text-muted-foreground",
              isActive && "bg-primary/10 text-primary",
              isLocked && "bg-muted/50 text-muted-foreground"
            )}
          >
            {isLocked ? <Lock className="h-6 w-6 lg:h-5 lg:w-5" /> : <Icon className="h-6 w-6 lg:h-5 lg:w-5" />}
          </div>

          {/* Title */}
          <h3 className="font-medium text-base lg:text-sm text-center mb-1.5 lg:mb-1 leading-tight">
            {t(`steps.${stepId}.title`)}
          </h3>

          {/* Description - hidden on locked cards */}
          {!isLocked && (
            <p className="text-xs lg:text-[11px] text-muted-foreground text-center leading-snug mb-4 lg:mb-3 line-clamp-2 min-h-[2.5em]">
              {t(`steps.${stepId}.description`)}
            </p>
          )}

          {/* Locked message */}
          {isLocked && (
            <p className="text-xs lg:text-[11px] text-muted-foreground text-center mb-4 lg:mb-3">
              {t("completePrevious")}
            </p>
          )}

          {/* Action buttons */}
          {isActive && (
            <div className="space-y-2 lg:space-y-1.5">
              <Button size="sm" onClick={handleStart} className="w-full h-9 lg:h-8 text-sm lg:text-xs">
                {t("start")}
              </Button>
              {config.canSkip && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSkip}
                  className="w-full h-8 lg:h-7 text-xs lg:text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <SkipForward className="h-3.5 w-3.5 lg:h-3 lg:w-3 mr-1" />
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
              className="w-full h-8 lg:h-7 text-xs lg:text-[11px] text-muted-foreground hover:text-foreground"
            >
              {isCompleted ? t("viewAgain") : t("doNow")}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
