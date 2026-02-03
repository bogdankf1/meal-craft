"use client";

import { useEffect, useRef } from "react";
import { useUserStore, type UIVisibility } from "@/lib/store/user-store";
import {
  useGetUIPreferencesQuery,
  useUpdateUIPreferencesMutation,
} from "@/lib/api/preferences-api";
import { useIsAuthenticated } from "@/lib/hooks/use-is-authenticated";

/**
 * UIPreferencesSyncProvider - Syncs UI preferences between local Zustand store and backend.
 *
 * This component:
 * 1. Fetches UI preferences from the backend when the user is authenticated
 * 2. Merges backend preferences with local store
 * 3. Updates the backend when local store changes (debounced)
 */
export function UIPreferencesSyncProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const { preferences, setUIVisibility } = useUserStore();
  const uiVisibility = preferences.uiVisibility;

  // Track if we've done the initial sync from backend
  const initialSyncDone = useRef(false);
  // Track the last synced state to avoid unnecessary updates
  const lastSyncedState = useRef<string | null>(null);
  // Debounce timer ref
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch preferences from backend (only when authenticated)
  const { data: backendPrefs, isSuccess: fetchSuccess } = useGetUIPreferencesQuery(undefined, {
    skip: !isAuthenticated,
  });

  // Mutation to update backend
  const [updateBackend] = useUpdateUIPreferencesMutation();

  // Effect to sync backend preferences to local store on initial load
  useEffect(() => {
    if (fetchSuccess && backendPrefs && !initialSyncDone.current) {
      // Merge backend preferences with local store
      const backendVisibility = backendPrefs.uiVisibility;
      setUIVisibility(backendVisibility);
      lastSyncedState.current = JSON.stringify(backendVisibility);
      initialSyncDone.current = true;
    }
  }, [fetchSuccess, backendPrefs, setUIVisibility]);

  // Effect to sync local store changes to backend (debounced)
  useEffect(() => {
    // Skip if not authenticated or initial sync not done yet
    if (!isAuthenticated || !initialSyncDone.current) {
      return;
    }

    const currentState = JSON.stringify(uiVisibility);

    // Skip if state hasn't changed
    if (currentState === lastSyncedState.current) {
      return;
    }

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce the backend update (500ms)
    debounceTimer.current = setTimeout(() => {
      updateBackend({ uiVisibility });
      lastSyncedState.current = currentState;
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [isAuthenticated, uiVisibility, updateBackend]);

  // Reset sync state on logout
  useEffect(() => {
    if (!isAuthenticated) {
      initialSyncDone.current = false;
      lastSyncedState.current = null;
    }
  }, [isAuthenticated]);

  return <>{children}</>;
}
