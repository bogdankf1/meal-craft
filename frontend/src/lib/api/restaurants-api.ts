import { baseApi } from "./base-api";

// Meal type enum
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

// Order type enum
export type OrderType = "dine_in" | "delivery" | "takeout";

export const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: "dine_in", label: "Dine In" },
  { value: "delivery", label: "Delivery" },
  { value: "takeout", label: "Takeout" },
];

// Import source enum
export type ImportSource =
  | "manual"
  | "text"
  | "voice"
  | "photo"
  | "receipt"
  | "screenshot";

// Common meal tags
export const MEAL_TAGS = [
  "healthy",
  "cheat_meal",
  "business",
  "date_night",
  "family",
  "quick_bite",
  "celebration",
  "comfort_food",
];

// ============ Restaurant (Place) Types ============

export interface Restaurant {
  id: string;
  user_id: string;
  name: string;
  cuisine_type: string | null;
  location: string | null;
  notes: string | null;
  favorite_dishes: string[] | null;
  image_url: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  meal_count: number;
}

export interface RestaurantListResponse {
  items: Restaurant[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface RestaurantFilters {
  search?: string;
  cuisine_type?: string;
  is_favorite?: boolean;
  is_archived?: boolean;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  page?: number;
  per_page?: number;
}

export interface CreateRestaurantInput {
  name: string;
  cuisine_type?: string | null;
  location?: string | null;
  notes?: string | null;
  favorite_dishes?: string[] | null;
  image_url?: string | null;
  is_favorite?: boolean;
}

export interface UpdateRestaurantInput {
  name?: string;
  cuisine_type?: string | null;
  location?: string | null;
  notes?: string | null;
  favorite_dishes?: string[] | null;
  image_url?: string | null;
  is_favorite?: boolean;
  is_archived?: boolean;
}

// ============ Restaurant Meal Types ============

export interface RestaurantMeal {
  id: string;
  user_id: string;
  restaurant_id: string | null;
  restaurant_name: string;
  meal_date: string;
  meal_time: string | null;
  meal_type: MealType;
  order_type: OrderType;
  items_ordered: string[] | null;
  description: string | null;
  estimated_calories: number | null;
  rating: number | null;
  feeling_after: number | null;
  tags: string[] | null;
  notes: string | null;
  image_url: string | null;
  import_source: ImportSource | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface RestaurantMealListResponse {
  items: RestaurantMeal[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface RestaurantMealFilters {
  search?: string;
  restaurant_id?: string;
  meal_type?: MealType;
  order_type?: OrderType;
  rating_min?: number;
  rating_max?: number;
  tags?: string;
  date_from?: string;
  date_to?: string;
  is_archived?: boolean;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  page?: number;
  per_page?: number;
}

export interface CreateRestaurantMealInput {
  restaurant_name: string;
  restaurant_id?: string | null;
  meal_date: string;
  meal_time?: string | null;
  meal_type: MealType;
  order_type: OrderType;
  items_ordered?: string[] | null;
  description?: string | null;
  estimated_calories?: number | null;
  rating?: number | null;
  feeling_after?: number | null;
  tags?: string[] | null;
  notes?: string | null;
  image_url?: string | null;
  import_source?: ImportSource;
}

export interface UpdateRestaurantMealInput {
  restaurant_name?: string;
  restaurant_id?: string | null;
  meal_date?: string;
  meal_time?: string | null;
  meal_type?: MealType;
  order_type?: OrderType;
  items_ordered?: string[] | null;
  description?: string | null;
  estimated_calories?: number | null;
  rating?: number | null;
  feeling_after?: number | null;
  tags?: string[] | null;
  notes?: string | null;
  image_url?: string | null;
  is_archived?: boolean;
}

// ============ Analytics Types ============

export interface MealsByOrderType {
  order_type: string;
  count: number;
}

export interface MealsByMealType {
  meal_type: string;
  count: number;
}

export interface TopRestaurant {
  restaurant_name: string;
  restaurant_id: string | null;
  visit_count: number;
  avg_rating: number | null;
}

export interface MealsByTag {
  tag: string;
  count: number;
}

export interface HomeVsOutRatio {
  home_cooked: number;
  eating_out: number;
  eating_out_percentage: number;
}

export interface RestaurantMealAnalytics {
  total_meals: number;
  meals_this_week: number;
  meals_this_month: number;
  avg_rating: number | null;
  avg_feeling: number | null;
  by_order_type: MealsByOrderType[];
  by_meal_type: MealsByMealType[];
  top_restaurants: TopRestaurant[];
  by_tags: MealsByTag[];
  home_vs_out: HomeVsOutRatio | null;
  recent_meals: RestaurantMeal[];
}

export interface MonthlyMealData {
  month: string;
  month_label: string;
  total_meals: number;
  by_order_type: Record<string, number>;
  by_meal_type: Record<string, number>;
  avg_rating: number | null;
  unique_restaurants: number;
}

export interface RestaurantMealHistory {
  period_months: number;
  total_meals: number;
  avg_monthly_meals: number;
  monthly_data: MonthlyMealData[];
  all_time_top_restaurants: TopRestaurant[];
}

// ============ Bulk Action Types ============

export interface BulkActionResponse {
  success: boolean;
  affected_count: number;
  message: string;
}

// ============ Import Types ============

export interface ParseTextRequest {
  text: string;
  default_date?: string;
}

export interface ParseTextResponse {
  parsed_meals: CreateRestaurantMealInput[];
  raw_text: string;
  success: boolean;
  message?: string;
}

// ============ API Endpoints ============

export const restaurantsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ============ Restaurant Meals ============

    // List restaurant meals with filters
    getRestaurantMeals: builder.query<
      RestaurantMealListResponse,
      RestaurantMealFilters
    >({
      query: (params) => ({
        url: "/restaurants/meals",
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "RestaurantMeals" as const,
                id,
              })),
              { type: "RestaurantMeals", id: "LIST" },
            ]
          : [{ type: "RestaurantMeals", id: "LIST" }],
    }),

    // Get single restaurant meal
    getRestaurantMeal: builder.query<RestaurantMeal, string>({
      query: (id) => `/restaurants/meals/${id}`,
      providesTags: (_result, _error, id) => [{ type: "RestaurantMeals", id }],
    }),

    // Create restaurant meals (batch)
    createRestaurantMeals: builder.mutation<
      RestaurantMeal[],
      CreateRestaurantMealInput[]
    >({
      query: (items) => ({
        url: "/restaurants/meals",
        method: "POST",
        body: { items },
      }),
      invalidatesTags: [
        { type: "RestaurantMeals", id: "LIST" },
        { type: "RestaurantMeals", id: "ANALYTICS" },
        { type: "RestaurantMeals", id: "HISTORY" },
        { type: "Restaurants", id: "LIST" },
      ],
    }),

    // Update restaurant meal
    updateRestaurantMeal: builder.mutation<
      RestaurantMeal,
      { id: string; data: UpdateRestaurantMealInput }
    >({
      query: ({ id, data }) => ({
        url: `/restaurants/meals/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "RestaurantMeals", id },
        { type: "RestaurantMeals", id: "LIST" },
        { type: "RestaurantMeals", id: "ANALYTICS" },
        { type: "RestaurantMeals", id: "HISTORY" },
      ],
    }),

    // Delete restaurant meal
    deleteRestaurantMeal: builder.mutation<void, string>({
      query: (id) => ({
        url: `/restaurants/meals/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "RestaurantMeals", id },
        { type: "RestaurantMeals", id: "LIST" },
        { type: "RestaurantMeals", id: "ANALYTICS" },
        { type: "RestaurantMeals", id: "HISTORY" },
        { type: "Restaurants", id: "LIST" },
      ],
    }),

    // Calculate/recalculate nutrition for a restaurant meal using AI
    calculateRestaurantMealNutrition: builder.mutation<RestaurantMeal, string>({
      query: (id) => ({
        url: `/restaurants/meals/${id}/calculate-nutrition`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "RestaurantMeals", id },
        { type: "RestaurantMeals", id: "LIST" },
        { type: "RestaurantMeals", id: "ANALYTICS" },
      ],
    }),

    // Bulk archive meals
    bulkArchiveRestaurantMeals: builder.mutation<BulkActionResponse, string[]>({
      query: (ids) => ({
        url: "/restaurants/meals/bulk-archive",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: (_result, _error, ids) => [
        { type: "RestaurantMeals", id: "LIST" },
        { type: "RestaurantMeals", id: "ANALYTICS" },
        { type: "RestaurantMeals", id: "HISTORY" },
        ...ids.map((id) => ({ type: "RestaurantMeals" as const, id })),
      ],
    }),

    // Bulk unarchive meals
    bulkUnarchiveRestaurantMeals: builder.mutation<BulkActionResponse, string[]>(
      {
        query: (ids) => ({
          url: "/restaurants/meals/bulk-unarchive",
          method: "POST",
          body: { ids },
        }),
        invalidatesTags: (_result, _error, ids) => [
          { type: "RestaurantMeals", id: "LIST" },
          { type: "RestaurantMeals", id: "ANALYTICS" },
          { type: "RestaurantMeals", id: "HISTORY" },
          ...ids.map((id) => ({ type: "RestaurantMeals" as const, id })),
        ],
      }
    ),

    // Bulk delete meals
    bulkDeleteRestaurantMeals: builder.mutation<BulkActionResponse, string[]>({
      query: (ids) => ({
        url: "/restaurants/meals/bulk-delete",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: [
        { type: "RestaurantMeals", id: "LIST" },
        { type: "RestaurantMeals", id: "ANALYTICS" },
        { type: "RestaurantMeals", id: "HISTORY" },
        { type: "Restaurants", id: "LIST" },
      ],
    }),

    // Get analytics
    getRestaurantMealAnalytics: builder.query<RestaurantMealAnalytics, void>({
      query: () => "/restaurants/meals/analytics",
      providesTags: [{ type: "RestaurantMeals", id: "ANALYTICS" }],
    }),

    // Get history
    getRestaurantMealHistory: builder.query<RestaurantMealHistory, number>({
      query: (months) => `/restaurants/meals/history?months=${months}`,
      providesTags: [{ type: "RestaurantMeals", id: "HISTORY" }],
    }),

    // Parse text
    parseRestaurantMealText: builder.mutation<
      ParseTextResponse,
      ParseTextRequest
    >({
      query: (body) => ({
        url: "/restaurants/meals/parse-text",
        method: "POST",
        body,
      }),
    }),

    // Parse voice recording
    parseRestaurantMealVoice: builder.mutation<ParseTextResponse, FormData>({
      query: (formData) => ({
        url: "/restaurants/meals/parse-voice",
        method: "POST",
        body: formData,
      }),
    }),

    // Parse image (photo, receipt, screenshot)
    parseRestaurantMealImage: builder.mutation<ParseTextResponse, FormData>({
      query: (formData) => ({
        url: "/restaurants/meals/parse-image",
        method: "POST",
        body: formData,
      }),
    }),

    // ============ Restaurants (Places) ============

    // List restaurants
    getRestaurants: builder.query<RestaurantListResponse, RestaurantFilters>({
      query: (params) => ({
        url: "/restaurants",
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "Restaurants" as const,
                id,
              })),
              { type: "Restaurants", id: "LIST" },
            ]
          : [{ type: "Restaurants", id: "LIST" }],
    }),

    // Get single restaurant
    getRestaurant: builder.query<Restaurant, string>({
      query: (id) => `/restaurants/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Restaurants", id }],
    }),

    // Create restaurant
    createRestaurant: builder.mutation<Restaurant, CreateRestaurantInput>({
      query: (body) => ({
        url: "/restaurants",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Restaurants", id: "LIST" }],
    }),

    // Update restaurant
    updateRestaurant: builder.mutation<
      Restaurant,
      { id: string; data: UpdateRestaurantInput }
    >({
      query: ({ id, data }) => ({
        url: `/restaurants/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Restaurants", id },
        { type: "Restaurants", id: "LIST" },
      ],
    }),

    // Delete restaurant
    deleteRestaurant: builder.mutation<void, string>({
      query: (id) => ({
        url: `/restaurants/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Restaurants", id },
        { type: "Restaurants", id: "LIST" },
      ],
    }),
  }),
});

export const {
  // Restaurant Meals
  useGetRestaurantMealsQuery,
  useGetRestaurantMealQuery,
  useCreateRestaurantMealsMutation,
  useUpdateRestaurantMealMutation,
  useDeleteRestaurantMealMutation,
  useCalculateRestaurantMealNutritionMutation,
  useBulkArchiveRestaurantMealsMutation,
  useBulkUnarchiveRestaurantMealsMutation,
  useBulkDeleteRestaurantMealsMutation,
  useGetRestaurantMealAnalyticsQuery,
  useGetRestaurantMealHistoryQuery,
  useParseRestaurantMealTextMutation,
  useParseRestaurantMealVoiceMutation,
  useParseRestaurantMealImageMutation,
  // Restaurants
  useGetRestaurantsQuery,
  useGetRestaurantQuery,
  useCreateRestaurantMutation,
  useUpdateRestaurantMutation,
  useDeleteRestaurantMutation,
} = restaurantsApi;
