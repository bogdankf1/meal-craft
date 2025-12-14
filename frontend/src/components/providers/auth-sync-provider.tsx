"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";

// Extended session type that includes backend tokens (matches auth.ts module augmentation)
interface ExtendedSession extends Session {
  backendAccessToken?: string;
  backendRefreshToken?: string;
}

// Module-level tracking to avoid duplicate writes (persists across renders)
let lastSyncedToken: string | null = null;

/**
 * Sync tokens to localStorage immediately (called during render and in effect).
 * This ensures tokens are available before any API calls.
 */
function syncTokensToStorage(session: ExtendedSession | null, status: string) {
  if (typeof window === "undefined") return;

  if (status === "authenticated" && session) {
    // Sync access token if changed
    if (
      session.backendAccessToken &&
      session.backendAccessToken !== lastSyncedToken
    ) {
      localStorage.setItem("auth_token", session.backendAccessToken);
      lastSyncedToken = session.backendAccessToken;
    }

    // Sync refresh token
    if (session.backendRefreshToken) {
      localStorage.setItem("refresh_token", session.backendRefreshToken);
    }
  } else if (status === "unauthenticated") {
    // Clear tokens on logout
    if (lastSyncedToken !== null) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("refresh_token");
      lastSyncedToken = null;
    }
  }
}

/**
 * AuthSyncProvider - Syncs NextAuth session token with localStorage for API calls.
 *
 * This component watches the NextAuth session and stores the backend JWT token
 * in localStorage so that the RTK Query baseApi can use it for authenticated requests.
 */
export function AuthSyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  // Sync tokens in effect (standard React pattern)
  useEffect(() => {
    if (status === "loading") return;
    syncTokensToStorage(session as ExtendedSession | null, status);
  }, [session, status]);

  // Show nothing while loading session
  if (status === "loading") {
    return null;
  }

  // Also sync immediately on first render after loading completes
  // This handles the initial auth state before the effect runs
  syncTokensToStorage(session as ExtendedSession | null, status);

  return <>{children}</>;
}
