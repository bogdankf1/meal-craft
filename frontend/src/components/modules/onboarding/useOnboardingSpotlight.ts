"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useOnboardingStore, type OnboardingStepId } from "@/lib/store/onboarding-store";
import type { SpotlightTarget } from "./SpotlightOverlay";

// Define spotlight configurations for each step
// Each step can have multiple spotlight targets on different pages
const SPOTLIGHT_CONFIGS: Record<OnboardingStepId, Record<string, SpotlightTarget[]>> = {
  household: {
    // On settings page with household tab
    "/settings": [
      { selector: "[data-spotlight='add-member-button']", padding: 8, borderRadius: 8 },
      { selector: "[data-spotlight='add-first-member']", padding: 12, borderRadius: 12 },
    ],
  },
  groceries: {
    "/groceries": [
      { selector: "[data-spotlight='import-methods-primary']", padding: 16, borderRadius: 12 },
    ],
  },
  pantry: {
    "/groceries": [
      { selector: "[data-spotlight='move-to-pantry-button']", padding: 8, borderRadius: 8 },
    ],
  },
  nutrition: {
    "/nutrition": [
      { selector: "[data-spotlight='set-goal-button']", padding: 8, borderRadius: 8 },
    ],
  },
  recipes: {
    "/recipes": [
      { selector: "[data-spotlight='ai-recipe-filters']", padding: 12, borderRadius: 12 },
      { selector: "[data-spotlight='generate-recipes-button']", padding: 8, borderRadius: 8 },
    ],
  },
  meal_plan: {
    "/meal-planner": [
      { selector: "[data-spotlight='meal-cell-first']", padding: 8, borderRadius: 8 },
      { selector: "[data-spotlight='members-selector']", padding: 8, borderRadius: 8 },
    ],
  },
};

export function useOnboardingSpotlight(currentPath: string) {
  const searchParams = useSearchParams();
  const { steps, isDismissed } = useOnboardingStore();
  const [targets, setTargets] = useState<SpotlightTarget[]>([]);
  const [active, setActive] = useState(false);

  const isOnboarding = searchParams.get("onboarding") === "true";

  useEffect(() => {
    if (!isOnboarding || isDismissed) {
      requestAnimationFrame(() => {
        setActive(false);
        setTargets([]);
      });
      return;
    }

    // Find which step we're currently on based on URL and step status
    const activeStep = Object.entries(SPOTLIGHT_CONFIGS).find(([stepId, pathConfigs]) => {
      const step = steps[stepId as OnboardingStepId];
      // Only show spotlight for pending steps
      if (step?.status !== "pending") return false;

      // Check if current path matches any of the step's paths
      const normalizedPath = currentPath.replace(/^\/[a-z]{2}\//, "/"); // Remove locale prefix
      return Object.keys(pathConfigs).some((path) => normalizedPath.startsWith(path));
    });

    if (activeStep) {
      const [, pathConfigs] = activeStep;
      const normalizedPath = currentPath.replace(/^\/[a-z]{2}\//, "/");
      const matchingPath = Object.keys(pathConfigs).find((path) => normalizedPath.startsWith(path));

      if (matchingPath) {
        const stepTargets = pathConfigs[matchingPath];

        // Small delay to ensure DOM elements are rendered
        const timer = setTimeout(() => {
          // Check if any of the target elements exist in the DOM
          const existingTargets = stepTargets.filter((target) => {
            return document.querySelector(target.selector) !== null;
          });

          if (existingTargets.length > 0) {
            setTargets(existingTargets);
            setActive(true);
          } else {
            setActive(false);
          }
        }, 500);

        return () => clearTimeout(timer);
      }
    }

    requestAnimationFrame(() => {
      setActive(false);
      setTargets([]);
    });
  }, [currentPath, isOnboarding, isDismissed, steps]);

  const dismissSpotlight = () => {
    setActive(false);
  };

  return {
    targets,
    active,
    dismissSpotlight,
  };
}
