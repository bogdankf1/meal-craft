import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { Mutex } from "async-mutex";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Mutex to prevent multiple simultaneous refresh attempts
const refreshMutex = new Mutex();

// Base query with auth header
const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: "include",
  prepareHeaders: (headers) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }
    return headers;
  },
});

// Helper to clear auth tokens
const clearAuthTokens = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
  }
};

// Custom base query with automatic token refresh on 401
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // Skip requests if no auth token exists (except for auth endpoints)
  const requestUrl = typeof args === "string" ? args : args.url;
  const isAuthEndpoint = requestUrl?.includes("/auth/");

  if (typeof window !== "undefined" && !isAuthEndpoint) {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      // No token - skip the request and return a 401-like error
      return {
        error: {
          status: 401,
          data: { message: "No authentication token" },
        },
      };
    }
  }

  // Wait if another refresh is in progress
  await refreshMutex.waitForUnlock();

  let result = await rawBaseQuery(args, api, extraOptions);

  // If we get a 401, try to refresh the token
  if (result.error && result.error.status === 401) {
    // Check if we have a refresh token
    const refreshToken =
      typeof window !== "undefined"
        ? localStorage.getItem("refresh_token")
        : null;

    if (refreshToken && !refreshMutex.isLocked()) {
      const release = await refreshMutex.acquire();

      try {
        // Attempt to refresh the token
        const refreshResult = await rawBaseQuery(
          {
            url: "/auth/refresh",
            method: "POST",
            body: { refresh_token: refreshToken },
          },
          api,
          extraOptions
        );

        if (refreshResult.data) {
          const data = refreshResult.data as {
            access_token: string;
            refresh_token: string;
          };

          // Store new tokens
          localStorage.setItem("auth_token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);

          // Retry the original request with new token
          result = await rawBaseQuery(args, api, extraOptions);
        } else {
          // Refresh failed - clear tokens
          clearAuthTokens();

          // Only redirect if we're in the browser and not already on login page
          if (
            typeof window !== "undefined" &&
            !window.location.pathname.includes("/login")
          ) {
            window.location.href = "/login";
          }
        }
      } finally {
        release();
      }
    } else if (refreshMutex.isLocked()) {
      // Another refresh is in progress, wait and retry
      await refreshMutex.waitForUnlock();
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      // No refresh token available - clear any stale auth tokens
      clearAuthTokens();
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "User",
    "Profiles",
    "DietaryRestrictions",
    "NutritionalPreferences",
    "Groceries",
    "Recipes",
    "MealPlans",
    "ShoppingLists",
    "Pantry",
    "KitchenEquipment",
    "Restaurants",
    "RestaurantMeals",
    "Nutrition",
    "Health",
    "Learning",
    "Skills",
    "UserSkills",
    "LearningPaths",
    "UserLearningPaths",
    "PracticeLogs",
    "Subscription",
    "Tiers",
    "Seasonality",
    "Backup",
    "AdminUsers",
    "AdminTiers",
    "AdminAnalytics",
    "AdminFeatures",
    "AdminCurrencies",
    "Currencies",
    "Support",
    "SupportTopic",
    "UIPreferences",
    "Onboarding",
  ],
  endpoints: () => ({}),
});
