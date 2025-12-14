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

// Custom base query with automatic token refresh on 401
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
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
          // Refresh failed - clear tokens and redirect to login
          localStorage.removeItem("auth_token");
          localStorage.removeItem("refresh_token");

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
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "User",
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
  ],
  endpoints: () => ({}),
});
