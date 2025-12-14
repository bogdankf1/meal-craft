import { baseApi } from "./base-api";

// ============ Enums ============

export type ProduceCategory =
  | "vegetables"
  | "fruits"
  | "herbs"
  | "seafood"
  | "mushrooms"
  | "nuts"
  | "grains";

export const PRODUCE_CATEGORIES: { value: ProduceCategory; label: string }[] = [
  { value: "vegetables", label: "Vegetables" },
  { value: "fruits", label: "Fruits" },
  { value: "herbs", label: "Herbs" },
  { value: "seafood", label: "Seafood" },
  { value: "mushrooms", label: "Mushrooms" },
  { value: "nuts", label: "Nuts" },
  { value: "grains", label: "Grains" },
];

export type SpecialtyType = "ingredient" | "dish" | "technique" | "product";

export const SPECIALTY_TYPES: { value: SpecialtyType; label: string }[] = [
  { value: "ingredient", label: "Ingredient" },
  { value: "dish", label: "Dish" },
  { value: "technique", label: "Technique" },
  { value: "product", label: "Product" },
];

export type SupportedCountryCode = "UA" | "BR" | "US" | "PL" | "DE" | "FR" | "IT" | "ES" | "GB";

export const SUPPORTED_COUNTRIES: { code: SupportedCountryCode; name: string; flag: string }[] = [
  { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
];

// ============ Seasonal Produce Types ============

export interface SeasonalProduce {
  id: string;
  name: string;
  name_local: string | null;
  description: string | null;
  category: string;
  country_code: string;
  region: string | null;
  available_months: number[];
  peak_months: number[] | null;
  storage_tips: string | null;
  nutrition_highlights: string | null;
  culinary_uses: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_in_season: boolean;
  is_peak_season: boolean;
  is_favorite: boolean;
}

export interface SeasonalProduceListResponse {
  items: SeasonalProduce[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface SeasonalProduceFilters {
  search?: string;
  category?: string;
  country_code?: string;
  region?: string;
  month?: number;
  in_season_only?: boolean;
  peak_only?: boolean;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

// ============ Local Specialty Types ============

export interface LocalSpecialty {
  id: string;
  name: string;
  name_local: string | null;
  description: string | null;
  specialty_type: string;
  country_code: string;
  region: string | null;
  cultural_info: string | null;
  how_to_use: string | null;
  where_to_find: string | null;
  related_dishes: string[] | null;
  seasonal_availability: number[] | null;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalSpecialtyListResponse {
  items: LocalSpecialty[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface LocalSpecialtyFilters {
  search?: string;
  specialty_type?: string;
  country_code?: string;
  region?: string;
  is_featured?: boolean;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

// ============ User Preferences Types ============

export interface UserSeasonalPreferences {
  id: string;
  user_id: string;
  country_code: string | null;
  region: string | null;
  favorite_produce_ids: string[] | null;
  notification_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdatePreferencesInput {
  country_code?: string;
  region?: string;
  notification_enabled?: boolean;
}

// ============ AI Recommendation Types ============

export interface SeasonalRecommendation {
  produce_name: string;
  category: string;
  why_now: string;
  recipe_ideas: string[];
  storage_tip: string | null;
  is_peak: boolean;
}

export interface SeasonalRecommendationResponse {
  country_code: string;
  country_name: string;
  month: number;
  month_name: string;
  season: string;
  recommendations: SeasonalRecommendation[];
  seasonal_tip: string;
  generated_at: string;
}

export interface SeasonalRecommendationRequest {
  country_code: string;
  month?: number;
  preferences?: string[];
  available_ingredients?: string[];
}

export interface WeeklyPick {
  name: string;
  name_local: string | null;
  category: string;
  why_buy_now: string;
  budget_friendly: boolean;
  recipe_suggestion: string;
}

export interface WeeklyPicksResponse {
  country_code: string;
  country_name: string;
  week_of: string;
  picks: WeeklyPick[];
  market_tip: string;
}

// ============ Calendar Types ============

export interface MonthlySeasonalData {
  month: number;
  month_name: string;
  produce_count: number;
  peak_produce: string[];
  coming_soon: string[];
  ending_soon: string[];
}

export interface SeasonalCalendarResponse {
  country_code: string;
  country_name: string;
  months: MonthlySeasonalData[];
}

// ============ Country Info Types ============

export interface CountryInfo {
  code: string;
  name: string;
  name_local: string;
  hemisphere: string;
  produce_count: number;
  specialty_count: number;
}

export interface SupportedCountriesResponse {
  countries: CountryInfo[];
}

// ============ API Endpoints ============

const seasonalityApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ============ Countries ============
    getSupportedCountries: builder.query<SupportedCountriesResponse, void>({
      query: () => "/seasonality/countries",
      providesTags: ["Seasonality"],
    }),

    // ============ User Preferences ============
    getUserSeasonalPreferences: builder.query<UserSeasonalPreferences, void>({
      query: () => "/seasonality/preferences",
      providesTags: [{ type: "Seasonality", id: "PREFERENCES" }],
    }),

    updateUserSeasonalPreferences: builder.mutation<UserSeasonalPreferences, UpdatePreferencesInput>({
      query: (data) => ({
        url: "/seasonality/preferences",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: [
        { type: "Seasonality", id: "PREFERENCES" },
        { type: "Seasonality", id: "LIST" },
      ],
    }),

    addFavoriteProduce: builder.mutation<{ success: boolean; message: string }, string>({
      query: (produceId) => ({
        url: `/seasonality/preferences/favorites/${produceId}`,
        method: "POST",
      }),
      invalidatesTags: [
        { type: "Seasonality", id: "PREFERENCES" },
        { type: "Seasonality", id: "LIST" },
      ],
    }),

    removeFavoriteProduce: builder.mutation<{ success: boolean; message: string }, string>({
      query: (produceId) => ({
        url: `/seasonality/preferences/favorites/${produceId}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Seasonality", id: "PREFERENCES" },
        { type: "Seasonality", id: "LIST" },
      ],
    }),

    // ============ Seasonal Produce ============
    getSeasonalProduce: builder.query<SeasonalProduceListResponse, SeasonalProduceFilters | void>({
      query: (filters) => {
        const params = new URLSearchParams();
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              params.append(key, String(value));
            }
          });
        }
        return `/seasonality/produce?${params.toString()}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: "Seasonality" as const, id })),
              { type: "Seasonality", id: "LIST" },
            ]
          : [{ type: "Seasonality", id: "LIST" }],
    }),

    getProduceById: builder.query<SeasonalProduce, string>({
      query: (id) => `/seasonality/produce/${id}`,
      providesTags: (result, error, id) => [{ type: "Seasonality", id }],
    }),

    // ============ Local Specialties ============
    getLocalSpecialties: builder.query<LocalSpecialtyListResponse, LocalSpecialtyFilters | void>({
      query: (filters) => {
        const params = new URLSearchParams();
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              params.append(key, String(value));
            }
          });
        }
        return `/seasonality/specialties?${params.toString()}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: "Seasonality" as const, id })),
              { type: "Seasonality", id: "SPECIALTIES" },
            ]
          : [{ type: "Seasonality", id: "SPECIALTIES" }],
    }),

    getSpecialtyById: builder.query<LocalSpecialty, string>({
      query: (id) => `/seasonality/specialties/${id}`,
      providesTags: (result, error, id) => [{ type: "Seasonality", id }],
    }),

    // ============ Calendar ============
    getSeasonalCalendar: builder.query<SeasonalCalendarResponse, string>({
      query: (countryCode) => `/seasonality/calendar/${countryCode}`,
      providesTags: (result, error, countryCode) => [
        { type: "Seasonality", id: `CALENDAR_${countryCode}` },
      ],
    }),

    // ============ AI Recommendations ============
    getSeasonalRecommendations: builder.mutation<SeasonalRecommendationResponse, SeasonalRecommendationRequest>({
      query: (data) => ({
        url: "/seasonality/recommendations",
        method: "POST",
        body: data,
      }),
    }),

    getWeeklyPicks: builder.mutation<WeeklyPicksResponse, { country_code: string }>({
      query: (data) => ({
        url: "/seasonality/weekly-picks",
        method: "POST",
        body: data,
      }),
    }),

    // ============ Save Recommendation as Produce ============
    saveRecommendationAsProduce: builder.mutation<
      SeasonalProduce,
      {
        name: string;
        category: string;
        country_code: string;
        description?: string;
        storage_tips?: string;
        available_months: number[];
        peak_months?: number[];
        add_to_favorites?: boolean;
      }
    >({
      query: ({ add_to_favorites, ...data }) => ({
        url: `/seasonality/recommendations/save?add_to_favorites=${add_to_favorites || false}`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "Seasonality", id: "LIST" },
        { type: "Seasonality", id: "PREFERENCES" },
      ],
    }),

    // ============ Delete Produce ============
    deleteProduce: builder.mutation<{ success: boolean; message: string }, string>({
      query: (produceId) => ({
        url: `/seasonality/produce/${produceId}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Seasonality", id: "LIST" },
        { type: "Seasonality", id: "PREFERENCES" },
      ],
    }),
  }),
});

export const {
  // Countries
  useGetSupportedCountriesQuery,
  // Preferences
  useGetUserSeasonalPreferencesQuery,
  useUpdateUserSeasonalPreferencesMutation,
  useAddFavoriteProduceMutation,
  useRemoveFavoriteProduceMutation,
  // Produce
  useGetSeasonalProduceQuery,
  useGetProduceByIdQuery,
  // Specialties
  useGetLocalSpecialtiesQuery,
  useGetSpecialtyByIdQuery,
  // Calendar
  useGetSeasonalCalendarQuery,
  // AI Recommendations
  useGetSeasonalRecommendationsMutation,
  useGetWeeklyPicksMutation,
  useSaveRecommendationAsProduceMutation,
  useDeleteProduceMutation,
} = seasonalityApi;
