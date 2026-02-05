import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OnboardingStepStatus = "pending" | "skipped" | "completed";

export interface OnboardingStepState {
  status: OnboardingStepStatus;
}

export const ONBOARDING_STEPS = [
  "household",
  "nutrition",
  "groceries",
  "pantry",
  "recipes",
  "meal_plan",
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number];

export interface OnboardingState {
  isDismissed: boolean;
  steps: Record<OnboardingStepId, OnboardingStepState>;

  // Actions
  markStepCompleted: (stepId: OnboardingStepId) => void;
  markStepSkipped: (stepId: OnboardingStepId) => void;
  markStepPending: (stepId: OnboardingStepId) => void;
  dismissOnboarding: () => void;
  showOnboarding: () => void;
  setOnboardingState: (
    isDismissed: boolean,
    steps: Record<string, OnboardingStepState>
  ) => void;

  // Computed helpers
  getCompletedCount: () => number;
  getCurrentStep: () => OnboardingStepId | null;
  isStepAccessible: (stepId: OnboardingStepId) => boolean;
  isAllComplete: () => boolean;
}

const defaultSteps: Record<OnboardingStepId, OnboardingStepState> = {
  household: { status: "pending" },
  groceries: { status: "pending" },
  pantry: { status: "pending" },
  nutrition: { status: "pending" },
  recipes: { status: "pending" },
  meal_plan: { status: "pending" },
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      isDismissed: false,
      steps: { ...defaultSteps },

      markStepCompleted: (stepId) =>
        set((state) => ({
          steps: {
            ...state.steps,
            [stepId]: { status: "completed" },
          },
        })),

      markStepSkipped: (stepId) =>
        set((state) => ({
          steps: {
            ...state.steps,
            [stepId]: { status: "skipped" },
          },
        })),

      markStepPending: (stepId) =>
        set((state) => ({
          steps: {
            ...state.steps,
            [stepId]: { status: "pending" },
          },
        })),

      dismissOnboarding: () => set({ isDismissed: true }),

      showOnboarding: () => set({ isDismissed: false }),

      setOnboardingState: (isDismissed, steps) => {
        const normalizedSteps: Record<OnboardingStepId, OnboardingStepState> = {
          ...defaultSteps,
        };

        for (const stepId of ONBOARDING_STEPS) {
          if (steps[stepId]) {
            normalizedSteps[stepId] = steps[stepId];
          }
        }

        set({ isDismissed, steps: normalizedSteps });
      },

      getCompletedCount: () => {
        const { steps } = get();
        return ONBOARDING_STEPS.filter(
          (stepId) =>
            steps[stepId].status === "completed" ||
            steps[stepId].status === "skipped"
        ).length;
      },

      getCurrentStep: () => {
        const { steps } = get();
        for (const stepId of ONBOARDING_STEPS) {
          if (steps[stepId].status === "pending") {
            return stepId;
          }
        }
        return null;
      },

      isStepAccessible: (stepId) => {
        const { steps } = get();
        const stepIndex = ONBOARDING_STEPS.indexOf(stepId);

        // First step is always accessible
        if (stepIndex === 0) return true;

        // A step is accessible if the previous step is completed or skipped
        const prevStepId = ONBOARDING_STEPS[stepIndex - 1];
        return (
          steps[prevStepId].status === "completed" ||
          steps[prevStepId].status === "skipped"
        );
      },

      isAllComplete: () => {
        const { steps } = get();
        return ONBOARDING_STEPS.every(
          (stepId) =>
            steps[stepId].status === "completed" ||
            steps[stepId].status === "skipped"
        );
      },
    }),
    {
      name: "mealcraft-onboarding",
    }
  )
);
