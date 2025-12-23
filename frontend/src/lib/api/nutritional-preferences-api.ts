import { baseApi } from "./base-api";

// Types
export type DietType =
  | "omnivore"
  | "vegetarian"
  | "vegan"
  | "pescatarian"
  | "keto"
  | "paleo"
  | "mediterranean"
  | "flexitarian";

export type NutritionalGoal =
  | "high_protein"
  | "low_carb"
  | "low_fat"
  | "low_sodium"
  | "high_fiber"
  | "low_sugar"
  | "calorie_conscious";

export type MealPreference =
  | "whole_foods"
  | "avoid_processed"
  | "budget_friendly"
  | "quick_meals"
  | "meal_prep"
  | "kid_friendly";

export interface NutritionalPreference {
  id: string;
  profile_id: string;
  diet_type: DietType;
  goals: NutritionalGoal[];
  preferences: MealPreference[];
  created_at: string;
  updated_at: string;
}

export interface NutritionalPreferenceUpdate {
  diet_type?: DietType;
  goals?: NutritionalGoal[];
  preferences?: MealPreference[];
}

export interface ProfilePreferences {
  profile_id: string;
  profile_name: string;
  profile_color: string | null;
  diet_type: string;
  goals: string[];
  preferences: string[];
}

export interface AllPreferencesResponse {
  profiles: ProfilePreferences[];
  combined_diet_type: string;
  combined_goals: string[];
  combined_preferences: string[];
}

// Constants for UI
export const DIET_TYPES: { value: DietType; labelKey: string }[] = [
  { value: "omnivore", labelKey: "omnivore" },
  { value: "vegetarian", labelKey: "vegetarian" },
  { value: "vegan", labelKey: "vegan" },
  { value: "pescatarian", labelKey: "pescatarian" },
  { value: "keto", labelKey: "keto" },
  { value: "paleo", labelKey: "paleo" },
  { value: "mediterranean", labelKey: "mediterranean" },
  { value: "flexitarian", labelKey: "flexitarian" },
];

export const NUTRITIONAL_GOALS: { value: NutritionalGoal; labelKey: string }[] = [
  { value: "high_protein", labelKey: "highProtein" },
  { value: "low_carb", labelKey: "lowCarb" },
  { value: "low_fat", labelKey: "lowFat" },
  { value: "low_sodium", labelKey: "lowSodium" },
  { value: "high_fiber", labelKey: "highFiber" },
  { value: "low_sugar", labelKey: "lowSugar" },
  { value: "calorie_conscious", labelKey: "calorieConscious" },
];

export const MEAL_PREFERENCES: { value: MealPreference; labelKey: string }[] = [
  { value: "whole_foods", labelKey: "wholeFoods" },
  { value: "avoid_processed", labelKey: "avoidProcessed" },
  { value: "budget_friendly", labelKey: "budgetFriendly" },
  { value: "quick_meals", labelKey: "quickMeals" },
  { value: "meal_prep", labelKey: "mealPrep" },
  { value: "kid_friendly", labelKey: "kidFriendly" },
];

// API Slice
export const nutritionalPreferencesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get nutritional preferences for a profile
    getNutritionalPreference: builder.query<NutritionalPreference, string>({
      query: (profileId) => `/nutritional-preferences/profile/${profileId}`,
      providesTags: (_result, _error, profileId) => [
        { type: "NutritionalPreferences", id: profileId },
      ],
    }),

    // Get all preferences (grouped by profile, with combined values)
    getAllNutritionalPreferences: builder.query<AllPreferencesResponse, void>({
      query: () => "/nutritional-preferences/all",
      providesTags: ["NutritionalPreferences"],
    }),

    // Create or update nutritional preferences
    updateNutritionalPreference: builder.mutation<
      NutritionalPreference,
      { profileId: string; data: NutritionalPreferenceUpdate }
    >({
      query: ({ profileId, data }) => ({
        url: `/nutritional-preferences/profile/${profileId}`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { profileId }) => [
        { type: "NutritionalPreferences", id: profileId },
        "NutritionalPreferences",
      ],
    }),

    // Delete nutritional preferences (reset to defaults)
    deleteNutritionalPreference: builder.mutation<void, string>({
      query: (profileId) => ({
        url: `/nutritional-preferences/profile/${profileId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, profileId) => [
        { type: "NutritionalPreferences", id: profileId },
        "NutritionalPreferences",
      ],
    }),
  }),
});

export const {
  useGetNutritionalPreferenceQuery,
  useGetAllNutritionalPreferencesQuery,
  useUpdateNutritionalPreferenceMutation,
  useDeleteNutritionalPreferenceMutation,
} = nutritionalPreferencesApi;
