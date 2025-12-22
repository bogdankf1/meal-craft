import { baseApi } from "./base-api";

// ============ Types ============

export type GoalType = "weight_loss" | "muscle_gain" | "maintenance" | "custom";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type NutritionSource = "meal_plan" | "restaurant" | "custom";

export interface NutritionGoal {
  id: string;
  user_id: string;
  profile_id: string | null;
  daily_calories: number | null;
  daily_protein_g: number | null;
  daily_carbs_g: number | null;
  daily_fat_g: number | null;
  daily_fiber_g: number | null;
  daily_sugar_g: number | null;
  daily_sodium_mg: number | null;
  goal_type: GoalType | null;
  start_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NutritionGoalCreate {
  daily_calories?: number | null;
  daily_protein_g?: number | null;
  daily_carbs_g?: number | null;
  daily_fat_g?: number | null;
  daily_fiber_g?: number | null;
  daily_sugar_g?: number | null;
  daily_sodium_mg?: number | null;
  goal_type?: GoalType;
  start_date?: string | null;
  profile_id?: string | null;
}

export interface NutritionGoalUpdate {
  daily_calories?: number | null;
  daily_protein_g?: number | null;
  daily_carbs_g?: number | null;
  daily_fat_g?: number | null;
  daily_fiber_g?: number | null;
  daily_sugar_g?: number | null;
  daily_sodium_mg?: number | null;
  goal_type?: GoalType;
  is_active?: boolean;
}

export interface NutritionLog {
  id: string;
  user_id: string;
  profile_id: string | null;
  date: string;
  meal_type: MealType | null;
  meal_id: string | null;
  restaurant_meal_id: string | null;
  name: string | null;
  manual_entry: boolean;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
}

export interface NutritionLogCreate {
  date: string;
  meal_type?: MealType | null;
  meal_id?: string | null;
  restaurant_meal_id?: string | null;
  name?: string | null;
  manual_entry?: boolean;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  fiber_g?: number | null;
  sugar_g?: number | null;
  sodium_mg?: number | null;
  notes?: string | null;
  profile_id?: string | null;
}

export interface NutritionLogUpdate {
  date?: string;
  meal_type?: MealType | null;
  name?: string | null;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  fiber_g?: number | null;
  sugar_g?: number | null;
  sodium_mg?: number | null;
  notes?: string | null;
  is_archived?: boolean;
}

export interface NutritionLogListResponse {
  items: NutritionLog[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface HealthMetric {
  id: string;
  user_id: string;
  profile_id: string | null;
  date: string;
  weight_kg: number | null;
  body_fat_percent: number | null;
  steps: number | null;
  active_calories: number | null;
  sleep_hours: number | null;
  heart_rate_avg: number | null;
  source: string | null;
  created_at: string;
}

export interface HealthMetricCreate {
  date: string;
  weight_kg?: number | null;
  body_fat_percent?: number | null;
  steps?: number | null;
  active_calories?: number | null;
  sleep_hours?: number | null;
  heart_rate_avg?: number | null;
  source?: string;
  profile_id?: string | null;
}

export interface HealthMetricListResponse {
  items: HealthMetric[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface NutritionEntry {
  id: string;
  source: NutritionSource;
  source_id: string | null;
  name: string;
  meal_type: MealType | null;
  date: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
}

export interface DailyNutritionSummary {
  date: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_fiber_g: number;
  total_sugar_g: number;
  total_sodium_mg: number;
  meal_count: number;
  entries: NutritionEntry[];
}

export interface DailyNutritionWithGoals extends DailyNutritionSummary {
  goal: NutritionGoal | null;
  calories_percent: number | null;
  protein_percent: number | null;
  carbs_percent: number | null;
  fat_percent: number | null;
  fiber_percent: number | null;
  sugar_percent: number | null;
  sodium_percent: number | null;
}

export interface WeeklyNutritionSummary {
  start_date: string;
  end_date: string;
  days: DailyNutritionSummary[];
  avg_daily_calories: number;
  avg_daily_protein_g: number;
  avg_daily_carbs_g: number;
  avg_daily_fat_g: number;
  avg_daily_fiber_g: number;
  total_meals: number;
}

export interface NutritionAnalytics {
  period_days: number;
  start_date: string;
  end_date: string;
  avg_daily_calories: number;
  avg_daily_protein_g: number;
  avg_daily_carbs_g: number;
  avg_daily_fat_g: number;
  avg_daily_fiber_g: number;
  avg_daily_sugar_g: number;
  avg_daily_sodium_mg: number;
  goal_achievement_rate: number | null;
  days_logged: number;
  total_meals: number;
  meals_from_plan: number;
  meals_from_restaurant: number;
  meals_custom: number;
  daily_data: DailyNutritionSummary[];
}

export interface NutritionEstimate {
  name: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
}

// ============ Query Params ============

export interface NutritionLogFilters {
  date_from?: string;
  date_to?: string;
  meal_type?: MealType;
  is_archived?: boolean;
  profile_id?: string | null;
  page?: number;
  per_page?: number;
}

export interface HealthMetricFilters {
  date_from?: string;
  date_to?: string;
  profile_id?: string | null;
  page?: number;
  per_page?: number;
}

// ============ API ============

export const nutritionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ============ Goals ============
    getNutritionGoals: builder.query<NutritionGoal[], { activeOnly?: boolean; profileId?: string | null }>({
      query: ({ activeOnly = true, profileId } = {}) => ({
        url: "/nutrition/goals",
        params: {
          active_only: activeOnly,
          // Only include profile_id if it's a valid string (not null/undefined)
          ...(profileId && { profile_id: profileId }),
        },
      }),
      providesTags: ["Nutrition"],
    }),

    getActiveNutritionGoal: builder.query<NutritionGoal | null, string | null | undefined>({
      query: (profileId) => ({
        url: "/nutrition/goals/active",
        // Only include profile_id if it's a valid string
        params: profileId ? { profile_id: profileId } : undefined,
      }),
      providesTags: ["Nutrition"],
    }),

    createNutritionGoal: builder.mutation<NutritionGoal, NutritionGoalCreate>({
      query: (data) => ({
        url: "/nutrition/goals",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Nutrition"],
    }),

    updateNutritionGoal: builder.mutation<NutritionGoal, { id: string; data: NutritionGoalUpdate }>({
      query: ({ id, data }) => ({
        url: `/nutrition/goals/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Nutrition"],
    }),

    deleteNutritionGoal: builder.mutation<void, string>({
      query: (id) => ({
        url: `/nutrition/goals/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Nutrition"],
    }),

    // ============ Custom Logs ============
    getNutritionLogs: builder.query<NutritionLogListResponse, NutritionLogFilters>({
      query: (params) => {
        // Filter out null/undefined values to avoid sending "null" strings
        const cleanParams = Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== null && v !== undefined)
        );
        return {
          url: "/nutrition/logs",
          params: cleanParams,
        };
      },
      providesTags: ["Nutrition"],
    }),

    createNutritionLog: builder.mutation<NutritionLog, NutritionLogCreate>({
      query: (data) => ({
        url: "/nutrition/logs",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Nutrition"],
    }),

    updateNutritionLog: builder.mutation<NutritionLog, { id: string; data: NutritionLogUpdate }>({
      query: ({ id, data }) => ({
        url: `/nutrition/logs/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Nutrition"],
    }),

    deleteNutritionLog: builder.mutation<void, string>({
      query: (id) => ({
        url: `/nutrition/logs/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Nutrition"],
    }),

    // ============ Health Metrics ============
    getHealthMetrics: builder.query<HealthMetricListResponse, HealthMetricFilters>({
      query: (params) => {
        // Filter out null/undefined values to avoid sending "null" strings
        const cleanParams = Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== null && v !== undefined)
        );
        return {
          url: "/nutrition/health-metrics",
          params: cleanParams,
        };
      },
      providesTags: ["Health"],
    }),

    createHealthMetric: builder.mutation<HealthMetric, HealthMetricCreate>({
      query: (data) => ({
        url: "/nutrition/health-metrics",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Health"],
    }),

    deleteHealthMetric: builder.mutation<void, string>({
      query: (id) => ({
        url: `/nutrition/health-metrics/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Health"],
    }),

    // ============ Aggregated Data ============
    getDailyNutrition: builder.query<DailyNutritionWithGoals, { date: string; profileId?: string | null }>({
      query: ({ date, profileId }) => ({
        url: `/nutrition/daily/${date}`,
        // Only include profile_id if it's a valid string
        params: profileId ? { profile_id: profileId } : undefined,
      }),
      providesTags: ["Nutrition"],
    }),

    getWeeklyNutrition: builder.query<WeeklyNutritionSummary, { startDate?: string; profileId?: string | null }>({
      query: ({ startDate, profileId } = {}) => ({
        url: "/nutrition/weekly",
        params: {
          ...(startDate && { start_date: startDate }),
          // Only include profile_id if it's a valid string
          ...(profileId && { profile_id: profileId }),
        },
      }),
      providesTags: ["Nutrition"],
    }),

    getNutritionAnalytics: builder.query<NutritionAnalytics, { days?: number; profileId?: string | null }>({
      query: ({ days = 30, profileId } = {}) => ({
        url: "/nutrition/analytics",
        params: {
          days,
          // Only include profile_id if it's a valid string
          ...(profileId && { profile_id: profileId }),
        },
      }),
      providesTags: ["Nutrition"],
    }),

    // ============ Calculations ============
    calculateRecipeNutrition: builder.mutation<NutritionEstimate, string>({
      query: (recipeId) => ({
        url: "/nutrition/calculate/recipe",
        method: "POST",
        body: { recipe_id: recipeId },
      }),
    }),

    calculateFoodNutrition: builder.mutation<NutritionEstimate, string>({
      query: (description) => ({
        url: "/nutrition/calculate/food",
        method: "POST",
        body: { description },
      }),
    }),
  }),
});

export const {
  // Goals
  useGetNutritionGoalsQuery,
  useGetActiveNutritionGoalQuery,
  useCreateNutritionGoalMutation,
  useUpdateNutritionGoalMutation,
  useDeleteNutritionGoalMutation,
  // Logs
  useGetNutritionLogsQuery,
  useCreateNutritionLogMutation,
  useUpdateNutritionLogMutation,
  useDeleteNutritionLogMutation,
  // Health Metrics
  useGetHealthMetricsQuery,
  useCreateHealthMetricMutation,
  useDeleteHealthMetricMutation,
  // Aggregated Data
  useGetDailyNutritionQuery,
  useGetWeeklyNutritionQuery,
  useGetNutritionAnalyticsQuery,
  // Calculations
  useCalculateRecipeNutritionMutation,
  useCalculateFoodNutritionMutation,
} = nutritionApi;

// Goal type options for UI
export const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: "weight_loss", label: "Weight Loss" },
  { value: "muscle_gain", label: "Muscle Gain" },
  { value: "maintenance", label: "Maintenance" },
  { value: "custom", label: "Custom" },
];

// Meal type options for UI
export const NUTRITION_MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];
