"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    if (status === "authenticated" && session) {
      const extendedSession = session as ExtendedSession;

      // Store backend access token in localStorage
      if (extendedSession.backendAccessToken) {
        localStorage.setItem("auth_token", extendedSession.backendAccessToken);
      }

      // Also store refresh token for potential token refresh
      if (extendedSession.backendRefreshToken) {
        localStorage.setItem("refresh_token", extendedSession.backendRefreshToken);
      }
    } else if (status === "unauthenticated") {
      // Clear tokens on logout
      localStorage.removeItem("auth_token");
      localStorage.removeItem("refresh_token");
    }
  }, [session, status]);

  return <>{children}</>;
}
