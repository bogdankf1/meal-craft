import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    credentials: "include",
    prepareHeaders: (headers) => {
      // Add auth token if available
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("auth_token");
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }
      }
      return headers;
    },
  }),
  tagTypes: [
    "User",
    "Groceries",
    "Recipes",
    "MealPlans",
    "ShoppingLists",
    "Pantry",
    "Restaurants",
    "Nutrition",
    "Health",
    "Learning",
    "Subscription",
    "Tiers",
  ],
  endpoints: () => ({}),
});
