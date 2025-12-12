"use client";

import { useTranslations } from "next-intl";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface NutritionProgressProps {
  label: string;
  current: number;
  goal: number | null;
  unit: string;
  color?: "default" | "success" | "warning" | "danger";
}

export function NutritionProgress({
  label,
  current,
  goal,
  unit,
  color = "default",
}: NutritionProgressProps) {
  const t = useTranslations("nutrition");

  const percentage = goal ? Math.min((current / goal) * 100, 100) : 0;
  const isOverGoal = goal && current > goal;

  const getProgressColor = () => {
    if (color !== "default") {
      switch (color) {
        case "success":
          return "bg-green-500";
        case "warning":
          return "bg-yellow-500";
        case "danger":
          return "bg-red-500";
      }
    }
    if (isOverGoal) return "bg-red-500";
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-blue-500";
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {current.toFixed(0)}
          {goal && (
            <span className="text-muted-foreground">
              {" "}
              / {goal} {unit}
            </span>
          )}
          {!goal && <span className="text-muted-foreground"> {unit}</span>}
        </span>
      </div>
      {goal && (
        <div className="relative">
          <Progress value={percentage} className="h-2" />
          <div
            className={cn(
              "absolute top-0 left-0 h-2 rounded-full transition-all",
              getProgressColor()
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
      {goal && (
        <div className="text-xs text-muted-foreground text-right">
          {percentage.toFixed(0)}%
          {isOverGoal && (
            <span className="text-red-500 ml-1">
              (+{((current / goal - 1) * 100).toFixed(0)}%)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface MacroProgressBarProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goals?: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  };
}

export function MacroProgressBar({
  calories,
  protein,
  carbs,
  fat,
  goals,
}: MacroProgressBarProps) {
  const t = useTranslations("nutrition");

  // Calculate percentages for stacked bar
  const proteinCals = protein * 4;
  const carbsCals = carbs * 4;
  const fatCals = fat * 9;
  const totalMacroCals = proteinCals + carbsCals + fatCals;

  const proteinPct = totalMacroCals > 0 ? (proteinCals / totalMacroCals) * 100 : 33;
  const carbsPct = totalMacroCals > 0 ? (carbsCals / totalMacroCals) * 100 : 33;
  const fatPct = totalMacroCals > 0 ? (fatCals / totalMacroCals) * 100 : 34;

  return (
    <div className="space-y-3">
      {/* Stacked macro bar */}
      <div className="h-3 rounded-full overflow-hidden flex bg-muted">
        <div
          className="bg-blue-500 transition-all"
          style={{ width: `${proteinPct}%` }}
          title={`${t("macros.protein")}: ${proteinPct.toFixed(0)}%`}
        />
        <div
          className="bg-green-500 transition-all"
          style={{ width: `${carbsPct}%` }}
          title={`${t("macros.carbs")}: ${carbsPct.toFixed(0)}%`}
        />
        <div
          className="bg-yellow-500 transition-all"
          style={{ width: `${fatPct}%` }}
          title={`${t("macros.fat")}: ${fatPct.toFixed(0)}%`}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>
            {t("macros.protein")}: {protein.toFixed(0)}g ({proteinPct.toFixed(0)}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>
            {t("macros.carbs")}: {carbs.toFixed(0)}g ({carbsPct.toFixed(0)}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>
            {t("macros.fat")}: {fat.toFixed(0)}g ({fatPct.toFixed(0)}%)
          </span>
        </div>
      </div>
    </div>
  );
}
