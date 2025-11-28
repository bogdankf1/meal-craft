import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { User } from "next-auth";
import type { JWT } from "next-auth/jwt";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Extended user type with backend fields
interface ExtendedUser extends User {
  backendAccessToken?: string;
  backendRefreshToken?: string;
  backendUserId?: string;
  subscriptionTier?: string;
  role?: string;
}

// Backend auth response types
interface BackendAuthResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
    role: string;
    subscription_tier: string;
    locale: string;
    is_active: boolean;
  };
  tokens: {
    access_token: string;
    refresh_token: string;
    token_type: string;
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && profile) {
        try {
          // Sync user with backend and get JWT tokens
          const response = await fetch(`${API_URL}/auth/google`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              google_id: profile.sub,
              avatar_url: user.image,
            }),
          });

          if (!response.ok) {
            console.error("Failed to sync user with backend:", await response.text());
            return false;
          }

          const data: BackendAuthResponse = await response.json();

          // Store backend tokens in the user object (will be passed to jwt callback)
          const extendedUser = user as ExtendedUser;
          extendedUser.backendAccessToken = data.tokens.access_token;
          extendedUser.backendRefreshToken = data.tokens.refresh_token;
          extendedUser.backendUserId = data.user.id;
          extendedUser.subscriptionTier = data.user.subscription_tier;
          extendedUser.role = data.user.role;

          return true;
        } catch (error) {
          console.error("Error syncing user with backend:", error);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      // Initial sign in - transfer backend tokens to JWT
      if (account && user) {
        const extendedUser = user as ExtendedUser;
        token.accessToken = account.access_token;
        token.googleId = account.providerAccountId;
        token.backendAccessToken = extendedUser.backendAccessToken;
        token.backendRefreshToken = extendedUser.backendRefreshToken;
        token.backendUserId = extendedUser.backendUserId;
        token.subscriptionTier = extendedUser.subscriptionTier;
        token.role = extendedUser.role;
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.backendUserId as string;
        session.backendAccessToken = token.backendAccessToken as string | undefined;
        session.backendRefreshToken = token.backendRefreshToken as string | undefined;
        session.subscriptionTier = token.subscriptionTier as string | undefined;
        session.role = token.role as string | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    backendAccessToken?: string;
    backendRefreshToken?: string;
    subscriptionTier?: string;
    role?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    googleId?: string;
    backendAccessToken?: string;
    backendRefreshToken?: string;
    backendUserId?: string;
    subscriptionTier?: string;
    role?: string;
  }
}
