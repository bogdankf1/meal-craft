/**
 * Admin API for backend admin operations
 */
import { baseApi } from "./base-api";

// ==================== USER TYPES ====================

export type UserRole = "USER" | "ADMIN";
export type SubscriptionTier = "FREE" | "PLUS" | "PRO";

export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  subscription_tier: SubscriptionTier;
  is_active: boolean;
  created_at: string;
}

export interface AdminUserDetail extends AdminUser {
  avatar_url?: string;
  google_id?: string;
  locale?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  updated_at?: string;
}

export interface UserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  page_size: number;
}

export interface UserListParams {
  page?: number;
  page_size?: number;
  search?: string;
  role?: UserRole;
  tier?: SubscriptionTier;
}

export interface UserUpdate {
  role?: UserRole;
  subscription_tier?: SubscriptionTier;
  is_active?: boolean;
}

export interface UserSuspend {
  reason?: string;
}

// ==================== TIER TYPES ====================

export interface AdminTier {
  id: string;
  name: string;
  display_name: string;
  price_monthly?: number;
  features?: Record<string, unknown>;
  created_at: string;
}

export interface TierUpdate {
  display_name?: string;
  price_monthly?: number;
  features?: Record<string, unknown>;
}

export interface AdminFeature {
  id: string;
  key: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface TierFeature {
  tier_id: string;
  feature_id: string;
  feature_key: string;
  feature_name: string;
  enabled: boolean;
  limit_value?: number;
}

export interface TierFeatureAssignment {
  feature_id: string;
  enabled: boolean;
  limit_value?: number;
}

export interface TierFeatureComparisonItem {
  enabled: boolean;
  limit_value?: number;
  feature_key: string;
  feature_name: string;
}

// Map of tier_id -> feature_id -> feature data
export type TierFeaturesComparison = Record<string, Record<string, TierFeatureComparisonItem>>;

// ==================== ANALYTICS TYPES ====================

export interface PlatformStats {
  total_users: number;
  active_users: number;
  new_users_today: number;
  new_users_this_week: number;
  new_users_this_month: number;
  total_subscriptions: number;
  active_subscriptions: number;
  mrr: number;
  arr: number;
  churn_rate: number;
}

export interface UserAcquisition {
  date: string;
  count: number;
}

export interface EngagementMetrics {
  dau: number;
  wau: number;
  mau: number;
  avg_session_duration: number;
  retention_rate_30d: number;
}

export interface ModuleUsageStats {
  module: string;
  total_items: number;
  active_users: number;
  items_created_today: number;
  items_created_this_week: number;
}

// ==================== CURRENCY TYPES ====================

export interface AdminCurrency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  symbol_position: string;
  exchange_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CurrencyCreate {
  code: string;
  name: string;
  symbol: string;
  decimal_places?: number;
  symbol_position?: string;
  exchange_rate?: number;
  is_active?: boolean;
}

export interface CurrencyUpdate {
  name?: string;
  symbol?: string;
  decimal_places?: number;
  symbol_position?: string;
  exchange_rate?: number;
  is_active?: boolean;
}

// ==================== API ENDPOINTS ====================

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ========== USER ENDPOINTS ==========
    getUsers: builder.query<UserListResponse, UserListParams>({
      query: (params) => ({
        url: "/admin/users",
        params: {
          page: params.page || 1,
          page_size: params.page_size || 20,
          search: params.search || undefined,
          role: params.role || undefined,
          tier: params.tier || undefined,
        },
      }),
      providesTags: ["AdminUsers"],
    }),

    getUser: builder.query<AdminUserDetail, string>({
      query: (userId) => `/admin/users/${userId}`,
      providesTags: (_result, _error, userId) => [
        { type: "AdminUsers", id: userId },
      ],
    }),

    updateUser: builder.mutation<
      AdminUserDetail,
      { userId: string; data: UserUpdate }
    >({
      query: ({ userId, data }) => ({
        url: `/admin/users/${userId}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["AdminUsers"],
    }),

    suspendUser: builder.mutation<
      AdminUserDetail,
      { userId: string; data?: UserSuspend }
    >({
      query: ({ userId, data }) => ({
        url: `/admin/users/${userId}/suspend`,
        method: "POST",
        body: data || {},
      }),
      invalidatesTags: ["AdminUsers"],
    }),

    unsuspendUser: builder.mutation<AdminUserDetail, string>({
      query: (userId) => ({
        url: `/admin/users/${userId}/unsuspend`,
        method: "POST",
      }),
      invalidatesTags: ["AdminUsers"],
    }),

    // ========== TIER ENDPOINTS ==========
    getAdminTiers: builder.query<AdminTier[], void>({
      query: () => "/admin/tiers",
      providesTags: ["AdminTiers"],
    }),

    getAdminTier: builder.query<AdminTier, string>({
      query: (tierId) => `/admin/tiers/${tierId}`,
      providesTags: (_result, _error, tierId) => [
        { type: "AdminTiers", id: tierId },
      ],
    }),

    updateTier: builder.mutation<AdminTier, { tierId: string; data: TierUpdate }>(
      {
        query: ({ tierId, data }) => ({
          url: `/admin/tiers/${tierId}`,
          method: "PATCH",
          body: data,
        }),
        invalidatesTags: ["AdminTiers"],
      }
    ),

    getTierFeatures: builder.query<TierFeature[], string>({
      query: (tierId) => `/admin/tiers/${tierId}/features`,
      providesTags: (_result, _error, tierId) => [
        { type: "AdminFeatures", id: tierId },
      ],
    }),

    getAllFeatures: builder.query<AdminFeature[], void>({
      query: () => "/admin/tiers/features/all",
      providesTags: ["AdminFeatures"],
    }),

    getFeaturesComparison: builder.query<TierFeaturesComparison, void>({
      query: () => "/admin/tiers/features/comparison",
      providesTags: ["AdminFeatures"],
    }),

    assignFeatureToTier: builder.mutation<
      TierFeature,
      { tierId: string; data: TierFeatureAssignment }
    >({
      query: ({ tierId, data }) => ({
        url: `/admin/tiers/${tierId}/features`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["AdminFeatures", "AdminTiers"],
    }),

    // ========== ANALYTICS ENDPOINTS ==========
    getPlatformStats: builder.query<PlatformStats, void>({
      query: () => "/admin/analytics/platform-stats",
      providesTags: ["AdminAnalytics"],
    }),

    getUserAcquisition: builder.query<UserAcquisition[], number>({
      query: (days = 30) => `/admin/analytics/user-acquisition?days=${days}`,
      providesTags: ["AdminAnalytics"],
    }),

    getEngagementMetrics: builder.query<EngagementMetrics, void>({
      query: () => "/admin/analytics/engagement",
      providesTags: ["AdminAnalytics"],
    }),

    getModuleUsage: builder.query<ModuleUsageStats[], void>({
      query: () => "/admin/analytics/module-usage",
      providesTags: ["AdminAnalytics"],
    }),

    // ========== CURRENCY ENDPOINTS ==========
    getAdminCurrencies: builder.query<AdminCurrency[], { active_only?: boolean }>({
      query: (params) => ({
        url: "/admin/currencies",
        params: { active_only: params?.active_only ?? false },
      }),
      providesTags: ["AdminCurrencies"],
    }),

    getAdminCurrency: builder.query<AdminCurrency, string>({
      query: (currencyId) => `/admin/currencies/${currencyId}`,
      providesTags: (_result, _error, currencyId) => [
        { type: "AdminCurrencies", id: currencyId },
      ],
    }),

    createCurrency: builder.mutation<AdminCurrency, CurrencyCreate>({
      query: (data) => ({
        url: "/admin/currencies",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["AdminCurrencies"],
    }),

    updateCurrency: builder.mutation<
      AdminCurrency,
      { currencyId: string; data: CurrencyUpdate }
    >({
      query: ({ currencyId, data }) => ({
        url: `/admin/currencies/${currencyId}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["AdminCurrencies"],
    }),

    deleteCurrency: builder.mutation<void, string>({
      query: (currencyId) => ({
        url: `/admin/currencies/${currencyId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AdminCurrencies"],
    }),
  }),
  overrideExisting: false,
});

export const {
  // User hooks
  useGetUsersQuery,
  useGetUserQuery,
  useUpdateUserMutation,
  useSuspendUserMutation,
  useUnsuspendUserMutation,
  // Tier hooks
  useGetAdminTiersQuery,
  useGetAdminTierQuery,
  useUpdateTierMutation,
  useGetTierFeaturesQuery,
  useGetAllFeaturesQuery,
  useGetFeaturesComparisonQuery,
  useAssignFeatureToTierMutation,
  // Analytics hooks
  useGetPlatformStatsQuery,
  useGetUserAcquisitionQuery,
  useGetEngagementMetricsQuery,
  useGetModuleUsageQuery,
  // Currency hooks
  useGetAdminCurrenciesQuery,
  useGetAdminCurrencyQuery,
  useCreateCurrencyMutation,
  useUpdateCurrencyMutation,
  useDeleteCurrencyMutation,
} = adminApi;
