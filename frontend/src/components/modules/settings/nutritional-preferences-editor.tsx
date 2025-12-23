"use client";

import { useTranslations } from "next-intl";
import { Salad, Target, Utensils } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import {
  useGetNutritionalPreferenceQuery,
  useUpdateNutritionalPreferenceMutation,
  DIET_TYPES,
  NUTRITIONAL_GOALS,
  MEAL_PREFERENCES,
  type DietType,
  type NutritionalGoal,
  type MealPreference,
} from "@/lib/api/nutritional-preferences-api";
import { type Profile } from "@/lib/api/profiles-api";

interface NutritionalPreferencesEditorProps {
  profile: Profile;
}

export function NutritionalPreferencesEditor({ profile }: NutritionalPreferencesEditorProps) {
  const t = useTranslations("nutritionalPreferences");
  const tCommon = useTranslations("common");

  // API
  const { data: preference, isLoading } = useGetNutritionalPreferenceQuery(profile.id);
  const [updatePreference] = useUpdateNutritionalPreferenceMutation();

  const handleDietTypeChange = async (value: DietType) => {
    try {
      await updatePreference({
        profileId: profile.id,
        data: { diet_type: value },
      }).unwrap();
      toast.success(t("messages.updated"));
    } catch {
      toast.error(t("messages.updateError"));
    }
  };

  const handleGoalToggle = async (goal: NutritionalGoal) => {
    const currentGoals = preference?.goals || [];
    const newGoals = currentGoals.includes(goal)
      ? currentGoals.filter((g) => g !== goal)
      : [...currentGoals, goal];

    try {
      await updatePreference({
        profileId: profile.id,
        data: { goals: newGoals },
      }).unwrap();
      toast.success(t("messages.updated"));
    } catch {
      toast.error(t("messages.updateError"));
    }
  };

  const handlePreferenceToggle = async (pref: MealPreference) => {
    const currentPrefs = preference?.preferences || [];
    const newPrefs = currentPrefs.includes(pref)
      ? currentPrefs.filter((p) => p !== pref)
      : [...currentPrefs, pref];

    try {
      await updatePreference({
        profileId: profile.id,
        data: { preferences: newPrefs },
      }).unwrap();
      toast.success(t("messages.updated"));
    } catch {
      toast.error(t("messages.updateError"));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Diet Type */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Salad className="h-4 w-4 text-green-500" />
          <Label className="text-sm font-medium">{t("dietType.title")}</Label>
        </div>
        <Select
          value={preference?.diet_type || "omnivore"}
          onValueChange={(v) => handleDietTypeChange(v as DietType)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DIET_TYPES.map((diet) => (
              <SelectItem key={diet.value} value={diet.value}>
                {t(`dietType.options.${diet.labelKey}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Nutritional Goals */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-500" />
          <Label className="text-sm font-medium">{t("goals.title")}</Label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {NUTRITIONAL_GOALS.map((goal) => (
            <div key={goal.value} className="flex items-center space-x-2">
              <Checkbox
                id={`goal-${profile.id}-${goal.value}`}
                checked={(preference?.goals || []).includes(goal.value)}
                onCheckedChange={() => handleGoalToggle(goal.value)}
              />
              <label
                htmlFor={`goal-${profile.id}-${goal.value}`}
                className="text-sm cursor-pointer"
              >
                {t(`goals.options.${goal.labelKey}`)}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Meal Preferences */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Utensils className="h-4 w-4 text-orange-500" />
          <Label className="text-sm font-medium">{t("preferences.title")}</Label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {MEAL_PREFERENCES.map((pref) => (
            <div key={pref.value} className="flex items-center space-x-2">
              <Checkbox
                id={`pref-${profile.id}-${pref.value}`}
                checked={(preference?.preferences || []).includes(pref.value)}
                onCheckedChange={() => handlePreferenceToggle(pref.value)}
              />
              <label
                htmlFor={`pref-${profile.id}-${pref.value}`}
                className="text-sm cursor-pointer"
              >
                {t(`preferences.options.${pref.labelKey}`)}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
