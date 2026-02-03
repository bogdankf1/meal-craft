"use client";

import { useSession } from "next-auth/react";
import { useSyncExternalStore } from "react";

/**
 * Hook that checks if user is properly authenticated.
 * Requires BOTH NextAuth session AND auth token in localStorage.
 * This prevents API calls when session exists but token is missing/invalid.
 */

// Snapshot function to get current token state
function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("auth_token");
}

// Server snapshot (always false since no localStorage on server)
function getServerSnapshot(): boolean {
  return false;
}

// Subscribe to storage events for cross-tab sync
function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function useIsAuthenticated(): boolean {
  const { status } = useSession();
  const hasToken = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Both conditions must be true
  return status === "authenticated" && hasToken;
}
