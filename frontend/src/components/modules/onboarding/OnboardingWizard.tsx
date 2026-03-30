"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  AlertTriangle,
  ThumbsDown,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useOnboardingStore,
  type OnboardingStepId,
} from "@/lib/store/onboarding-store";
import { useUpdateOnboardingStepMutation } from "@/lib/api/onboarding-api";
import {
  useGetProfilesQuery,
  useCreateProfileMutation,
  useUpdateProfileMutation,
} from "@/lib/api/profiles-api";
import {
  useBulkCreateDietaryRestrictionsMutation,
} from "@/lib/api/dietary-restrictions-api";
import {
  useUpdateNutritionalPreferenceMutation,
  type DietType,
  type NutritionalGoal,
} from "@/lib/api/nutritional-preferences-api";
import {
  useCreateNutritionGoalMutation,
} from "@/lib/api/nutrition-api";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 4;

const DIET_OPTIONS: { value: DietType | "other"; label: string }[] = [
  { value: "omnivore", label: "Omnivore" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "keto", label: "Keto" },
  { value: "paleo", label: "Paleo" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "other", label: "Other" },
];

const PRESET_ALLERGIES = [
  "Peanuts",
  "Tree nuts",
  "Milk",
  "Eggs",
  "Wheat",
  "Soy",
  "Shellfish",
  "Fish",
];

const PRESET_DISLIKES = [
  "Mushrooms",
  "Olives",
  "Cilantro",
  "Blue Cheese",
  "Anchovies",
  "Liver",
];

const CALORIE_PRESETS = [1500, 1800, 2100, 2500];

const PRIORITY_OPTIONS: { value: NutritionalGoal; label: string }[] = [
  { value: "high_protein", label: "High Protein" },
  { value: "low_carb", label: "Low Carb" },
  { value: "low_fat", label: "Low Fat" },
  { value: "low_sodium", label: "Low Sodium" },
  { value: "high_fiber", label: "High Fiber" },
  { value: "low_sugar", label: "Low Sugar" },
];

// Wizard step IDs mapped to the onboarding store step IDs
const WIZARD_STEP_MAP: Record<number, OnboardingStepId> = {
  1: "household",
  2: "nutrition",
  3: "nutrition",
  4: "nutrition",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OnboardingWizard() {
  const t = useTranslations("onboarding");
  const router = useRouter();

  // Store
  const { markStepCompleted, markStepSkipped, dismissOnboarding } =
    useOnboardingStore();
  const [updateStep] = useUpdateOnboardingStepMutation();

  // API mutations
  const { data: profilesData } = useGetProfilesQuery();
  const [createProfile] = useCreateProfileMutation();
  const [updateProfile] = useUpdateProfileMutation();
  const [bulkCreateRestrictions] = useBulkCreateDietaryRestrictionsMutation();
  const [updateNutritionalPreference] =
    useUpdateNutritionalPreferenceMutation();
  const [createNutritionGoal] = useCreateNutritionGoalMutation();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1: Name
  const [name, setName] = useState("");

  // Step 2: Diet Type
  const [selectedDiet, setSelectedDiet] = useState<DietType | "other" | null>(
    null,
  );
  const [customDiet, setCustomDiet] = useState("");

  // Step 3: Restrictions
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState("");
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [dislikeInput, setDislikeInput] = useState("");

  // Step 4: Goals
  const [calorieTarget, setCalorieTarget] = useState("");
  const [priorities, setPriorities] = useState<NutritionalGoal[]>([]);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const defaultProfile = profilesData?.profiles?.find((p) => p.is_default);

  const avatarLetter = name.trim() ? name.trim()[0].toUpperCase() : null;

  const canContinue = useMemo(() => {
    switch (currentStep) {
      case 1:
        return name.trim().length > 0;
      case 2:
        return (
          selectedDiet !== null &&
          (selectedDiet !== "other" || customDiet.trim().length > 0)
        );
      case 3:
        return true; // always continuable
      case 4:
        return true; // always continuable
      default:
        return false;
    }
  }, [currentStep, name, selectedDiet, customDiet]);

  const exclusionFeedback = useMemo(() => {
    const all = [...allergies, ...dislikes];
    if (all.length === 0) return null;
    return `We'll exclude ${all.join(", ")} from your meal suggestions.`;
  }, [allergies, dislikes]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const toggleItem = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    item: string,
  ) => {
    setList((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  const addCustomItem = (
    input: string,
    setInput: React.Dispatch<React.SetStateAction<string>>,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    const trimmed = input.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList((prev) => [...prev, trimmed]);
    }
    setInput("");
  };

  const togglePriority = (goal: NutritionalGoal) => {
    setPriorities((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    );
  };

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  const saveStep1 = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    if (defaultProfile) {
      await updateProfile({
        id: defaultProfile.id,
        data: { name: trimmedName },
      }).unwrap();
    } else {
      await createProfile({ name: trimmedName }).unwrap();
    }

    markStepCompleted("household");
    await updateStep({ step_id: "household", status: "completed" });
  }, [
    name,
    defaultProfile,
    updateProfile,
    createProfile,
    markStepCompleted,
    updateStep,
  ]);

  const saveStep2 = useCallback(async () => {
    if (!selectedDiet) return;

    // Resolve the profile ID (might have just been created in step 1)
    const profileId = defaultProfile?.id;
    if (!profileId) return;

    const dietType: DietType =
      selectedDiet === "other" ? "omnivore" : selectedDiet;

    await updateNutritionalPreference({
      profileId,
      data: { diet_type: dietType },
    }).unwrap();

    markStepCompleted("nutrition");
    await updateStep({ step_id: "nutrition", status: "completed" });
  }, [
    selectedDiet,
    defaultProfile,
    updateNutritionalPreference,
    markStepCompleted,
    updateStep,
  ]);

  const saveStep3 = useCallback(async () => {
    const profileId = defaultProfile?.id;
    if (!profileId) return;

    const restrictions = [
      ...allergies.map((a) => ({
        ingredient_name: a,
        restriction_type: "allergy" as const,
      })),
      ...dislikes.map((d) => ({
        ingredient_name: d,
        restriction_type: "dislike" as const,
      })),
    ];

    if (restrictions.length > 0) {
      await bulkCreateRestrictions({
        profile_id: profileId,
        restrictions,
      }).unwrap();
    }
  }, [allergies, dislikes, defaultProfile, bulkCreateRestrictions]);

  const saveStep4 = useCallback(async () => {
    const profileId = defaultProfile?.id;
    if (!profileId) return;

    // Save calorie goal
    const calories = parseInt(calorieTarget, 10);
    if (!isNaN(calories) && calories > 0) {
      await createNutritionGoal({
        daily_calories: calories,
        goal_type: "custom",
        profile_id: profileId,
      }).unwrap();
    }

    // Save priority goals
    if (priorities.length > 0) {
      await updateNutritionalPreference({
        profileId,
        data: { goals: priorities },
      }).unwrap();
    }
  }, [
    calorieTarget,
    priorities,
    defaultProfile,
    createNutritionGoal,
    updateNutritionalPreference,
  ]);

  const finishOnboarding = useCallback(async () => {
    // Mark remaining onboarding steps as completed so the dashboard checklist clears
    const stepIds: OnboardingStepId[] = [
      "groceries",
      "pantry",
      "recipes",
      "meal_plan",
    ];
    for (const stepId of stepIds) {
      markStepSkipped(stepId);
      await updateStep({ step_id: stepId, status: "skipped" });
    }

    dismissOnboarding();
    router.push("/dashboard");
  }, [markStepSkipped, updateStep, dismissOnboarding, router]);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const handleContinue = useCallback(async () => {
    setIsSaving(true);
    try {
      switch (currentStep) {
        case 1:
          await saveStep1();
          break;
        case 2:
          await saveStep2();
          break;
        case 3:
          await saveStep3();
          break;
        case 4:
          await saveStep4();
          await finishOnboarding();
          return; // don't advance step
      }
      setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
    } catch {
      // Allow the user to retry
    } finally {
      setIsSaving(false);
    }
  }, [currentStep, saveStep1, saveStep2, saveStep3, saveStep4, finishOnboarding]);

  const handleBack = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  const handleSkip = useCallback(async () => {
    setIsSaving(true);
    try {
      const stepId = WIZARD_STEP_MAP[currentStep];
      if (stepId) {
        markStepSkipped(stepId);
        await updateStep({ step_id: stepId, status: "skipped" });
      }

      if (currentStep === TOTAL_STEPS) {
        await finishOnboarding();
      } else {
        setCurrentStep((s) => s + 1);
      }
    } catch {
      // Allow the user to retry
    } finally {
      setIsSaving(false);
    }
  }, [currentStep, markStepSkipped, updateStep, finishOnboarding]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderProgressBar = () => (
    <div className="flex gap-1.5">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors duration-150",
            i < currentStep ? "bg-primary" : "bg-muted",
          )}
        />
      ))}
    </div>
  );

  // Step 1 -------------------------------------------------------------------

  const renderStep1 = () => (
    <div className="flex flex-1 flex-col items-center px-6 pt-8">
      {/* Avatar */}
      <div
        className={cn(
          "flex h-[72px] w-[72px] items-center justify-center rounded-[22px] text-2xl font-medium transition-colors duration-150",
          avatarLetter
            ? "bg-primary text-white"
            : "bg-muted text-muted-foreground",
        )}
      >
        {avatarLetter ?? "?"}
      </div>

      <h2 className="mt-6 text-xl font-medium text-center">
        What&apos;s your name?
      </h2>
      <p className="mt-2 text-sm text-muted-foreground text-center">
        We&apos;ll use this to personalise your experience.
      </p>

      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your name"
        className="mt-6 max-w-xs text-center"
        onKeyDown={(e) => {
          if (e.key === "Enter" && canContinue) {
            handleContinue();
          }
        }}
      />
    </div>
  );

  // Step 2 -------------------------------------------------------------------

  const renderStep2 = () => (
    <div className="flex flex-1 flex-col px-6 pt-6">
      <h2 className="text-xl font-medium text-center">
        What&apos;s your diet type?
      </h2>
      <p className="mt-2 text-sm text-muted-foreground text-center">
        This helps us suggest meals you&apos;ll enjoy.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        {DIET_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSelectedDiet(option.value)}
            className={cn(
              "w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition-all duration-150",
              selectedDiet === option.value
                ? "border-2 border-primary bg-[var(--green-ghost)]"
                : "border border-border bg-card shadow-sm",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {selectedDiet === "other" && (
        <Input
          autoFocus
          value={customDiet}
          onChange={(e) => setCustomDiet(e.target.value)}
          placeholder="Describe your diet"
          className="mt-3"
        />
      )}
    </div>
  );

  // Step 3 -------------------------------------------------------------------

  const renderChipSection = (
    title: string,
    icon: React.ReactNode,
    items: string[],
    setItems: React.Dispatch<React.SetStateAction<string[]>>,
    inputValue: string,
    setInputValue: React.Dispatch<React.SetStateAction<string>>,
    presets: string[],
    selectedClassName: string,
  ) => (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </div>

      {/* Custom input */}
      <div className="mt-3 flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={`Add ${title.toLowerCase().replace("?", "").trim()}...`}
          className="flex-1 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustomItem(inputValue, setInputValue, items, setItems);
            }
          }}
        />
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() =>
            addCustomItem(inputValue, setInputValue, items, setItems)
          }
          disabled={!inputValue.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Preset chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {presets.map((preset) => {
          const isSelected = items.includes(preset);
          return (
            <button
              key={preset}
              type="button"
              onClick={() => toggleItem(items, setItems, preset)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150",
                isSelected
                  ? selectedClassName
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              {isSelected && <Check className="mr-1 inline-block h-3 w-3" />}
              {preset}
            </button>
          );
        })}
      </div>

      {/* Custom items not in presets */}
      {items.filter((i) => !presets.includes(i)).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items
            .filter((i) => !presets.includes(i))
            .map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggleItem(items, setItems, item)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150",
                  selectedClassName,
                )}
              >
                <Check className="mr-1 inline-block h-3 w-3" />
                {item}
              </button>
            ))}
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="flex flex-1 flex-col px-6 pt-6">
      <h2 className="text-xl font-medium text-center">Any restrictions?</h2>
      <p className="mt-2 text-sm text-muted-foreground text-center">
        We&apos;ll keep these out of your meal plans.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {renderChipSection(
          "Allergies",
          <AlertTriangle className="h-4 w-4 text-destructive" />,
          allergies,
          setAllergies,
          allergyInput,
          setAllergyInput,
          PRESET_ALLERGIES,
          "border-destructive bg-[var(--error-bg)] text-destructive",
        )}

        {renderChipSection(
          "Dislikes",
          <ThumbsDown className="h-4 w-4 text-accent" />,
          dislikes,
          setDislikes,
          dislikeInput,
          setDislikeInput,
          PRESET_DISLIKES,
          "border-accent bg-[var(--terra-wash)] text-accent",
        )}
      </div>

      {exclusionFeedback && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {exclusionFeedback}
        </p>
      )}
    </div>
  );

  // Step 4 -------------------------------------------------------------------

  const renderStep4 = () => (
    <div className="flex flex-1 flex-col px-6 pt-6">
      <h2 className="text-xl font-medium text-center">
        Set your nutrition goals
      </h2>
      <p className="mt-2 text-sm text-muted-foreground text-center">
        Optional targets to guide your meal plans.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {/* Calorie target card */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium">Daily calorie target</p>
          <Input
            type="number"
            inputMode="numeric"
            value={calorieTarget}
            onChange={(e) => setCalorieTarget(e.target.value)}
            placeholder="e.g. 2000"
            className="mt-3 text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {CALORIE_PRESETS.map((preset) => {
              const isSelected = calorieTarget === String(preset);
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCalorieTarget(String(preset))}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150",
                    isSelected
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-card text-foreground hover:bg-muted",
                  )}
                >
                  {preset.toLocaleString()} kcal
                </button>
              );
            })}
          </div>
        </div>

        {/* Priorities card */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium">Priorities</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {PRIORITY_OPTIONS.map((option) => {
              const isSelected = priorities.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => togglePriority(option.value)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150",
                    isSelected
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-card text-foreground hover:bg-muted",
                  )}
                >
                  {isSelected && (
                    <Check className="mr-1 inline-block h-3 w-3" />
                  )}
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  const stepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 bg-card px-4 pb-3 pt-4">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          {/* Back button */}
          <div className="w-9">
            {currentStep > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={handleBack}
                disabled={isSaving}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Step indicator + progress */}
          <div className="flex flex-1 flex-col gap-2">
            <p className="text-center text-xs font-medium text-muted-foreground">
              Step {currentStep} of {TOTAL_STEPS}
            </p>
            {renderProgressBar()}
          </div>

          {/* Spacer to balance the back button */}
          <div className="w-9" />
        </div>
      </header>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg pb-32">{stepContent()}</div>
      </main>

      {/* Fixed bottom bar */}
      <footer className="shrink-0 border-t border-border bg-card px-4 pb-6 pt-3">
        <div className="mx-auto flex max-w-lg flex-col gap-2">
          <Button
            className="w-full"
            size="lg"
            onClick={handleContinue}
            disabled={!canContinue || isSaving}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving...
              </span>
            ) : currentStep === TOTAL_STEPS ? (
              <span className="flex items-center gap-2">
                Let&apos;s go!
                <ArrowRight className="h-4 w-4" />
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Continue
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>

          {currentStep > 1 && (
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={handleSkip}
              disabled={isSaving}
            >
              <SkipForward className="mr-2 h-4 w-4" />
              Skip
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
