/**
 * Auth API for backend authentication
 */
import { baseApi } from "./base-api";

export interface GoogleAuthRequest {
  email: string;
  name?: string;
  google_id: string;
  avatar_url?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: string;
  subscription_tier: string;
  locale: string;
  is_active: boolean;
}

export interface AuthResponse {
  user: UserResponse;
  tokens: TokenResponse;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    googleAuth: builder.mutation<AuthResponse, GoogleAuthRequest>({
      query: (body) => ({
        url: "/auth/google",
        method: "POST",
        body,
      }),
      invalidatesTags: ["User"],
    }),

    refreshToken: builder.mutation<TokenResponse, RefreshTokenRequest>({
      query: (body) => ({
        url: "/auth/refresh",
        method: "POST",
        body,
      }),
    }),

    getMe: builder.query<UserResponse, void>({
      query: () => "/auth/me",
      providesTags: ["User"],
    }),

    verifyToken: builder.mutation<{ valid: boolean; user_id: string; email: string }, void>({
      query: () => ({
        url: "/auth/verify",
        method: "POST",
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGoogleAuthMutation,
  useRefreshTokenMutation,
  useGetMeQuery,
  useVerifyTokenMutation,
} = authApi;
