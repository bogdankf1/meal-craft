"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";

// Extended session type that includes backend tokens (matches auth.ts module augmentation)
interface ExtendedSession extends Session {
  backendAccessToken?: string;
  backendRefreshToken?: string;
}

/**
 * AuthSyncProvider - Syncs NextAuth session token with localStorage for API calls.
 *
 * This component watches the NextAuth session and stores the backend JWT token
 * in localStorage so that the RTK Query baseApi can use it for authenticated requests.
 */
export function AuthSyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const lastSyncedToken = useRef<string | null>(null);

  // Sync token to localStorage when session changes
  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (status === "authenticated" && session) {
      const extendedSession = session as ExtendedSession;

      // Only update if token changed to avoid unnecessary writes
      if (extendedSession.backendAccessToken && extendedSession.backendAccessToken !== lastSyncedToken.current) {
        localStorage.setItem("auth_token", extendedSession.backendAccessToken);
        lastSyncedToken.current = extendedSession.backendAccessToken;
      }

      // Also store refresh token for potential token refresh
      if (extendedSession.backendRefreshToken) {
        localStorage.setItem("refresh_token", extendedSession.backendRefreshToken);
      }
    } else if (status === "unauthenticated") {
      // Clear tokens on logout
      localStorage.removeItem("auth_token");
      localStorage.removeItem("refresh_token");
      lastSyncedToken.current = null;
    }
  }, [session, status]);

  // Show nothing while loading session
  if (status === "loading") {
    return null;
  }

  return <>{children}</>;
}
