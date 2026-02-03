"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  useOnboardingStore,
  ONBOARDING_STEPS,
  type OnboardingStepId,
} from "@/lib/store/onboarding-store";
import {
  useGetOnboardingStateQuery,
  useUpdateOnboardingStepMutation,
  useDismissOnboardingMutation,
  useLazyGetOnboardingDerivedStatusQuery,
} from "@/lib/api/onboarding-api";
import { useIsAuthenticated } from "@/lib/hooks/use-is-authenticated";

const POLL_INTERVAL = 30000; // 30 seconds

/**
 * OnboardingSyncProvider - Syncs onboarding state between local Zustand store and backend.
 *
 * This component:
 * 1. Fetches onboarding state from the backend when the user is authenticated
 * 2. Merges backend state with local store
 * 3. Updates the backend when local store changes
 * 4. Polls for derived status every 30s to auto-complete steps
 */
export function OnboardingSyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useIsAuthenticated();
  const {
    isDismissed,
    steps,
    setOnboardingState,
    markStepCompleted,
  } = useOnboardingStore();

  // Track if we've done the initial sync from backend
  const initialSyncDone = useRef(false);
  // Track the last synced state to avoid unnecessary updates
  const lastSyncedState = useRef<string | null>(null);
  // Debounce timer ref
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  // Polling timer ref
  const pollTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch state from backend (only when authenticated)
  const { data: backendState, isSuccess: fetchSuccess } =
    useGetOnboardingStateQuery(undefined, {
      skip: !isAuthenticated,
    });

  // Mutations
  const [updateStep] = useUpdateOnboardingStepMutation();
  const [dismissOnboarding] = useDismissOnboardingMutation();
  const [triggerGetDerivedStatus] = useLazyGetOnboardingDerivedStatusQuery();

  // Poll for derived status to auto-complete steps
  const pollDerivedStatus = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const result = await triggerGetDerivedStatus().unwrap();
      if (result.steps) {
        // Check if any step should be auto-completed
        for (const stepId of ONBOARDING_STEPS) {
          const isDerivedComplete = result.steps[stepId];
          const currentStatus = steps[stepId]?.status;

          // If derived shows complete but our state shows pending, mark as completed
          if (isDerivedComplete && currentStatus === "pending") {
            markStepCompleted(stepId);
            // Also update backend
            updateStep({ step_id: stepId, status: "completed" });
          }
        }
      }
    } catch {
      // Silently fail - we'll retry on next poll
    }
  }, [isAuthenticated, steps, markStepCompleted, triggerGetDerivedStatus, updateStep]);

  // Effect to sync backend state to local store on initial load
  useEffect(() => {
    if (fetchSuccess && backendState && !initialSyncDone.current) {
      setOnboardingState(backendState.is_dismissed, backendState.steps);
      lastSyncedState.current = JSON.stringify({
        isDismissed: backendState.is_dismissed,
        steps: backendState.steps,
      });
      initialSyncDone.current = true;
    }
  }, [fetchSuccess, backendState, setOnboardingState]);

  // Effect to sync local store changes to backend (debounced)
  useEffect(() => {
    // Skip if not authenticated or initial sync not done yet
    if (!isAuthenticated || !initialSyncDone.current) {
      return;
    }

    const currentState = JSON.stringify({ isDismissed, steps });

    // Skip if state hasn't changed
    if (currentState === lastSyncedState.current) {
      return;
    }

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce the backend update (500ms)
    debounceTimer.current = setTimeout(async () => {
      // Parse the last synced state for comparison
      const lastState = lastSyncedState.current
        ? JSON.parse(lastSyncedState.current)
        : null;

      // Check if dismissed state changed
      if (lastState && lastState.isDismissed !== isDismissed) {
        await dismissOnboarding({ is_dismissed: isDismissed });
      }

      // Check if any step status changed
      if (lastState) {
        for (const stepId of ONBOARDING_STEPS) {
          const lastStepStatus = lastState.steps?.[stepId]?.status;
          const currentStepStatus = steps[stepId]?.status;

          if (lastStepStatus !== currentStepStatus) {
            await updateStep({
              step_id: stepId as OnboardingStepId,
              status: currentStepStatus,
            });
          }
        }
      }

      lastSyncedState.current = currentState;
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [isAuthenticated, isDismissed, steps, dismissOnboarding, updateStep]);

  // Effect to set up polling for derived status
  useEffect(() => {
    if (!isAuthenticated || !initialSyncDone.current) {
      return;
    }

    // Initial poll
    pollDerivedStatus();

    // Set up interval
    pollTimer.current = setInterval(pollDerivedStatus, POLL_INTERVAL);

    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
      }
    };
  }, [isAuthenticated, pollDerivedStatus]);

  // Reset sync state on logout
  useEffect(() => {
    if (!isAuthenticated) {
      initialSyncDone.current = false;
      lastSyncedState.current = null;
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
      }
    }
  }, [isAuthenticated]);

  return <>{children}</>;
}
