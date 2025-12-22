import { baseApi } from "./base-api";

// ============ Meal Type ============

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

// ============ Meal Types ============

export interface Meal {
  id: string;
  meal_plan_id: string;
  date: string;
  meal_type: MealType;
  recipe_id: string | null;
  custom_name: string | null;
  servings: number | null;
  notes: string | null;
  is_leftover: boolean;
  leftover_from_meal_id: string | null;
  created_at: string;
  // Recipe details when available
  recipe_name: string | null;
  recipe_image_url: string | null;
  recipe_prep_time: number | null;
  recipe_cook_time: number | null;
}

export interface MealCreate {
  date: string;
  meal_type: MealType;
  recipe_id?: string | null;
  custom_name?: string | null;
  servings?: number | null;
  notes?: string | null;
  is_leftover?: boolean;
  leftover_from_meal_id?: string | null;
}

export interface MealUpdate {
  date?: string;
  meal_type?: MealType;
  recipe_id?: string | null;
  custom_name?: string | null;
  servings?: number | null;
  notes?: string | null;
  is_leftover?: boolean;
  leftover_from_meal_id?: string | null;
}

// ============ Meal Plan Types ============

export interface MealPlan {
  id: string;
  user_id: string;
  profile_id: string | null;
  name: string;
  date_start: string;
  date_end: string;
  servings: number;
  is_template: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  meal_count: number;
}

export interface MealPlanWithMeals extends Omit<MealPlan, "meal_count"> {
  meals: Meal[];
}

export interface MealPlanListItem {
  id: string;
  profile_id: string | null;
  name: string;
  date_start: string;
  date_end: string;
  servings: number;
  is_template: boolean;
  is_archived: boolean;
  created_at: string;
  meal_count: number;
}

export interface MealPlanCreate {
  name: string;
  date_start: string;
  date_end: string;
  servings?: number;
  is_template?: boolean;
  profile_id?: string | null;
}

export interface MealPlanUpdate {
  name?: string;
  date_start?: string;
  date_end?: string;
  servings?: number;
  is_template?: boolean;
  is_archived?: boolean;
  profile_id?: string | null;
}

// ============ Filter Types ============

export interface MealPlanFilters {
  search?: string;
  date_from?: string;
  date_to?: string;
  is_template?: boolean;
  is_archived?: boolean;
  profile_id?: string | null;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

// ============ Response Types ============

export interface MealPlanListResponse {
  items: MealPlanListItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface BulkActionResponse {
  success: boolean;
  affected_count: number;
  message: string;
}

// ============ Analytics Types ============

export interface MealsByType {
  meal_type: string;
  count: number;
}

export interface MealsByRecipe {
  recipe_id: string;
  recipe_name: string;
  count: number;
  category: string | null;
}

export interface WeeklyOverview {
  week_start: string;
  week_end: string;
  total_meals: number;
  meals_with_recipes: number;
  unique_recipes: number;
}

export interface MealPlanAnalytics {
  total_meal_plans: number;
  total_meals: number;
  total_archived: number;
  by_meal_type: MealsByType[];
  most_planned_recipes: MealsByRecipe[];
  current_week: WeeklyOverview | null;
  avg_meals_per_plan: number;
  recipe_variety_score: number;
}

export interface MonthlyMealPlanData {
  month: string;
  month_label: string;
  plans_created: number;
  meals_planned: number;
  unique_recipes: number;
}

export interface MealPlanHistory {
  period_months: number;
  total_plans: number;
  total_meals: number;
  monthly_data: MonthlyMealPlanData[];
}

// ============ Shopping List Generation ============

export interface GenerateShoppingListRequest {
  meal_plan_id: string;
  shopping_list_id?: string | null;
  shopping_list_name?: string | null;
  exclude_recipe_ids?: string[];
}

export interface GenerateShoppingListResponse {
  shopping_list_id: string;
  items_added: number;
  success: boolean;
  message: string | null;
}

// ============ Parse Types ============

export interface ParseMealPlanTextRequest {
  text: string;
  start_date?: string;
  default_servings?: number;
}

export interface ParsedMealPlanMeal {
  date: string;
  meal_type: MealType;
  recipe_name: string | null;
  custom_name: string | null;
  notes: string | null;
}

export interface ParseMealPlanResponse {
  name: string;
  date_start: string;
  date_end: string;
  meals: ParsedMealPlanMeal[];
  success: boolean;
  message: string | null;
}

// ============ Combined Week Plans (All Members View) ============

export interface ProfileInfo {
  id: string;
  name: string;
  color: string | null;
}

export interface MealWithProfile extends Meal {
  profile_id: string | null;
  profile_name: string | null;
  profile_color: string | null;
}

export interface CombinedWeekPlan {
  date_start: string;
  date_end: string;
  meals: MealWithProfile[];
  profiles: ProfileInfo[];
  plan_count: number;
}

// ============ Repeat Request ============

export interface RepeatMealPlanRequest {
  source_meal_plan_id: string;
  new_start_date: string;
  new_name?: string;
}

// ============ API Definition ============

export const mealPlannerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ============ Meal Plan CRUD ============

    getMealPlans: builder.query<MealPlanListResponse, MealPlanFilters>({
      query: (params) => {
        // Filter out null/undefined values to avoid sending "null" strings
        const cleanParams = Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== null && v !== undefined)
        );
        return {
          url: "/meal-plans",
          params: cleanParams,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "MealPlans" as const,
                id,
              })),
              { type: "MealPlans", id: "LIST" },
            ]
          : [{ type: "MealPlans", id: "LIST" }],
    }),

    getCurrentWeekPlan: builder.query<MealPlanWithMeals | null, { profileId?: string | null } | void>({
      query: (params) => {
        const profileId = params && 'profileId' in params ? params.profileId : undefined;
        return {
          url: "/meal-plans/current-week",
          // Only include profile_id if it's a valid string (not null/undefined)
          params: profileId ? { profile_id: profileId } : undefined,
        };
      },
      providesTags: [{ type: "MealPlans", id: "CURRENT_WEEK" }],
    }),

    getCombinedWeekPlan: builder.query<CombinedWeekPlan, void>({
      query: () => "/meal-plans/current-week/combined",
      providesTags: [{ type: "MealPlans", id: "CURRENT_WEEK_COMBINED" }],
    }),

    getMealPlan: builder.query<MealPlanWithMeals, string>({
      query: (id) => `/meal-plans/${id}`,
      providesTags: (_result, _error, id) => [{ type: "MealPlans", id }],
    }),

    createMealPlan: builder.mutation<MealPlan, MealPlanCreate>({
      query: (data) => ({
        url: "/meal-plans",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "MealPlans", id: "LIST" },
        { type: "MealPlans", id: "CURRENT_WEEK" },
        { type: "MealPlans", id: "ANALYTICS" },
      ],
    }),

    updateMealPlan: builder.mutation<
      MealPlan,
      { id: string; data: MealPlanUpdate }
    >({
      query: ({ id, data }) => ({
        url: `/meal-plans/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "MealPlans", id },
        { type: "MealPlans", id: "LIST" },
        { type: "MealPlans", id: "CURRENT_WEEK" },
      ],
    }),

    deleteMealPlan: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/meal-plans/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "MealPlans", id: "LIST" },
        { type: "MealPlans", id: "CURRENT_WEEK" },
        { type: "MealPlans", id: "ANALYTICS" },
      ],
    }),

    repeatMealPlan: builder.mutation<MealPlanWithMeals, RepeatMealPlanRequest>({
      query: (data) => ({
        url: "/meal-plans/repeat",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "MealPlans", id: "LIST" },
        { type: "MealPlans", id: "CURRENT_WEEK" },
        { type: "MealPlans", id: "ANALYTICS" },
      ],
    }),

    // ============ Meal CRUD ============

    createMeal: builder.mutation<Meal, { planId: string; data: MealCreate }>({
      query: ({ planId, data }) => ({
        url: `/meal-plans/${planId}/meals`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { planId }) => [
        { type: "MealPlans", id: planId },
        { type: "MealPlans", id: "CURRENT_WEEK" },
        { type: "MealPlans", id: "LIST" },
      ],
    }),

    bulkCreateMeals: builder.mutation<
      Meal[],
      { planId: string; meals: MealCreate[] }
    >({
      query: ({ planId, meals }) => ({
        url: `/meal-plans/${planId}/meals/bulk`,
        method: "POST",
        body: { meals },
      }),
      invalidatesTags: (_result, _error, { planId }) => [
        { type: "MealPlans", id: planId },
        { type: "MealPlans", id: "CURRENT_WEEK" },
        { type: "MealPlans", id: "LIST" },
      ],
    }),

    updateMeal: builder.mutation<
      Meal,
      { planId: string; mealId: string; data: MealUpdate }
    >({
      query: ({ planId, mealId, data }) => ({
        url: `/meal-plans/${planId}/meals/${mealId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { planId }) => [
        { type: "MealPlans", id: planId },
        { type: "MealPlans", id: "CURRENT_WEEK" },
      ],
    }),

    deleteMeal: builder.mutation<
      { success: boolean; message: string },
      { planId: string; mealId: string }
    >({
      query: ({ planId, mealId }) => ({
        url: `/meal-plans/${planId}/meals/${mealId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { planId }) => [
        { type: "MealPlans", id: planId },
        { type: "MealPlans", id: "CURRENT_WEEK" },
        { type: "MealPlans", id: "LIST" },
      ],
    }),

    bulkDeleteMeals: builder.mutation<
      BulkActionResponse,
      { planId: string; mealIds: string[] }
    >({
      query: ({ planId, mealIds }) => ({
        url: `/meal-plans/${planId}/meals/bulk-delete`,
        method: "POST",
        body: { meal_ids: mealIds },
      }),
      invalidatesTags: (_result, _error, { planId }) => [
        { type: "MealPlans", id: planId },
        { type: "MealPlans", id: "CURRENT_WEEK" },
        { type: "MealPlans", id: "LIST" },
      ],
    }),

    // ============ Bulk Actions ============

    bulkArchiveMealPlans: builder.mutation<BulkActionResponse, string[]>({
      query: (ids) => ({
        url: "/meal-plans/bulk-archive",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: [
        { type: "MealPlans", id: "LIST" },
        { type: "MealPlans", id: "CURRENT_WEEK" },
        { type: "MealPlans", id: "ANALYTICS" },
      ],
    }),

    bulkUnarchiveMealPlans: builder.mutation<BulkActionResponse, string[]>({
      query: (ids) => ({
        url: "/meal-plans/bulk-unarchive",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: [
        { type: "MealPlans", id: "LIST" },
        { type: "MealPlans", id: "CURRENT_WEEK" },
        { type: "MealPlans", id: "ANALYTICS" },
      ],
    }),

    bulkDeleteMealPlans: builder.mutation<BulkActionResponse, string[]>({
      query: (ids) => ({
        url: "/meal-plans/bulk-delete",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: [
        { type: "MealPlans", id: "LIST" },
        { type: "MealPlans", id: "CURRENT_WEEK" },
        { type: "MealPlans", id: "ANALYTICS" },
      ],
    }),

    // ============ Analytics ============

    getMealPlanAnalytics: builder.query<MealPlanAnalytics, void>({
      query: () => "/meal-plans/analytics/overview",
      providesTags: [{ type: "MealPlans", id: "ANALYTICS" }],
    }),

    getMealPlanHistory: builder.query<MealPlanHistory, number>({
      query: (months) => ({
        url: "/meal-plans/history",
        params: { months },
      }),
      providesTags: [{ type: "MealPlans", id: "HISTORY" }],
    }),

    // ============ Shopping List Generation ============

    generateShoppingList: builder.mutation<
      GenerateShoppingListResponse,
      GenerateShoppingListRequest
    >({
      query: (data) => ({
        url: "/meal-plans/generate-shopping-list",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "ShoppingLists", id: "LIST" }],
    }),

    // ============ Parse/Import ============

    parseMealPlanText: builder.mutation<
      ParseMealPlanResponse,
      ParseMealPlanTextRequest
    >({
      query: (data) => ({
        url: "/meal-plans/parse-text",
        method: "POST",
        body: data,
      }),
    }),

    parseMealPlanVoice: builder.mutation<ParseMealPlanResponse, FormData>({
      query: (formData) => ({
        url: "/meal-plans/parse-voice",
        method: "POST",
        body: formData,
      }),
    }),

    parseMealPlanImage: builder.mutation<ParseMealPlanResponse, FormData>({
      query: (formData) => ({
        url: "/meal-plans/parse-image",
        method: "POST",
        body: formData,
      }),
    }),
  }),
});

// Export hooks
export const {
  useGetMealPlansQuery,
  useGetCurrentWeekPlanQuery,
  useGetCombinedWeekPlanQuery,
  useGetMealPlanQuery,
  useLazyGetMealPlanQuery,
  useCreateMealPlanMutation,
  useUpdateMealPlanMutation,
  useDeleteMealPlanMutation,
  useRepeatMealPlanMutation,
  useCreateMealMutation,
  useBulkCreateMealsMutation,
  useUpdateMealMutation,
  useDeleteMealMutation,
  useBulkDeleteMealsMutation,
  useBulkArchiveMealPlansMutation,
  useBulkUnarchiveMealPlansMutation,
  useBulkDeleteMealPlansMutation,
  useGetMealPlanAnalyticsQuery,
  useGetMealPlanHistoryQuery,
  useGenerateShoppingListMutation,
  useParseMealPlanTextMutation,
  useParseMealPlanVoiceMutation,
  useParseMealPlanImageMutation,
} = mealPlannerApi;
