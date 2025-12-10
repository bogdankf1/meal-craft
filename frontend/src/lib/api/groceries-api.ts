import { baseApi } from "./base-api";

// Grocery category enum matching backend
export type GroceryCategory =
  | "produce"
  | "meat"
  | "seafood"
  | "dairy"
  | "bakery"
  | "frozen"
  | "pantry"
  | "beverages"
  | "snacks"
  | "condiments"
  | "spices"
  | "other";

export const GROCERY_CATEGORIES: { value: GroceryCategory; label: string }[] = [
  { value: "produce", label: "Produce" },
  { value: "meat", label: "Meat" },
  { value: "seafood", label: "Seafood" },
  { value: "dairy", label: "Dairy" },
  { value: "bakery", label: "Bakery" },
  { value: "frozen", label: "Frozen" },
  { value: "pantry", label: "Pantry" },
  { value: "beverages", label: "Beverages" },
  { value: "snacks", label: "Snacks" },
  { value: "condiments", label: "Condiments" },
  { value: "spices", label: "Spices" },
  { value: "other", label: "Other" },
];

export interface Grocery {
  id: string;
  user_id: string;
  item_name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  purchase_date: string;
  expiry_date: string | null;
  cost: number | null;
  store: string | null;
  is_archived: boolean;
  created_at: string;
}

export interface GroceryListResponse {
  items: Grocery[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface GroceryFilters {
  search?: string;
  category?: string;
  store?: string;
  date_from?: string;
  date_to?: string;
  is_archived?: boolean;
  expiring_within_days?: number;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface CreateGroceryInput {
  item_name: string;
  quantity?: number | null;
  unit?: string | null;
  category?: GroceryCategory | null;
  purchase_date: string;
  expiry_date?: string | null;
  cost?: number | null;
  store?: string | null;
}

export interface UpdateGroceryInput {
  item_name?: string;
  quantity?: number | null;
  unit?: string | null;
  category?: GroceryCategory | null;
  purchase_date?: string;
  expiry_date?: string | null;
  cost?: number | null;
  store?: string | null;
  is_archived?: boolean;
}

export interface GroceryAnalytics {
  total_items: number;
  items_this_week: number;
  items_this_month: number;
  total_spent_this_week: number;
  total_spent_this_month: number;
  expiring_soon: number;
  expired: number;
  category_breakdown: Record<string, number>;
  store_breakdown: Record<string, number>;
  spending_by_category: Record<string, number>;
  recent_items: Grocery[];
}

export interface MonthlyData {
  month: string;
  month_label: string;
  total_items: number;
  total_spent: number;
  category_breakdown: Record<string, number>;
  store_breakdown: Record<string, number>;
  spending_by_category: Record<string, number>;
}

export interface TopItem {
  item_name: string;
  total_quantity: number;
  purchase_count: number;
  total_spent: number;
  avg_price: number;
  last_purchased: string;
}

export interface GroceryHistory {
  period_months: number;
  total_items: number;
  total_spent: number;
  avg_monthly_items: number;
  avg_monthly_spending: number;
  monthly_data: MonthlyData[];
  top_items: TopItem[];
  category_trends: Record<string, Record<string, number>>;
  store_trends: Record<string, Record<string, number>>;
}

export interface BulkActionResponse {
  success: boolean;
  affected_count: number;
  message: string;
}

export interface ParseTextRequest {
  text: string;
  default_purchase_date?: string;
}

export interface ParseReceiptUrlRequest {
  url: string;
  default_purchase_date?: string;
}

export interface ParseTextResponse {
  parsed_items: CreateGroceryInput[];
  raw_text: string;
  success: boolean;
  message?: string;
}

export const groceriesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // List groceries with filters
    getGroceries: builder.query<GroceryListResponse, GroceryFilters>({
      query: (params) => ({
        url: "/groceries",
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "Groceries" as const,
                id,
              })),
              { type: "Groceries", id: "LIST" },
            ]
          : [{ type: "Groceries", id: "LIST" }],
    }),

    // Get single grocery
    getGrocery: builder.query<Grocery, string>({
      query: (id) => `/groceries/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Groceries", id }],
    }),

    // Create groceries (batch)
    createGroceries: builder.mutation<Grocery[], CreateGroceryInput[]>({
      query: (items) => ({
        url: "/groceries",
        method: "POST",
        body: { items },
      }),
      invalidatesTags: [
        { type: "Groceries", id: "LIST" },
        { type: "Groceries", id: "ANALYTICS" },
        { type: "Groceries", id: "HISTORY" },
      ],
    }),

    // Update grocery
    updateGrocery: builder.mutation<
      Grocery,
      { id: string; data: UpdateGroceryInput }
    >({
      query: ({ id, data }) => ({
        url: `/groceries/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Groceries", id },
        { type: "Groceries", id: "LIST" },
        { type: "Groceries", id: "ANALYTICS" },
        { type: "Groceries", id: "HISTORY" },
      ],
    }),

    // Delete grocery
    deleteGrocery: builder.mutation<void, string>({
      query: (id) => ({
        url: `/groceries/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Groceries", id },
        { type: "Groceries", id: "LIST" },
        { type: "Groceries", id: "ANALYTICS" },
        { type: "Groceries", id: "HISTORY" },
      ],
    }),

    // Bulk archive
    bulkArchiveGroceries: builder.mutation<BulkActionResponse, string[]>({
      query: (ids) => ({
        url: "/groceries/bulk-archive",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: (_result, _error, ids) => [
        { type: "Groceries", id: "LIST" },
        { type: "Groceries", id: "ANALYTICS" },
        { type: "Groceries", id: "HISTORY" },
        ...ids.map((id) => ({ type: "Groceries" as const, id })),
      ],
    }),

    // Bulk unarchive
    bulkUnarchiveGroceries: builder.mutation<BulkActionResponse, string[]>({
      query: (ids) => ({
        url: "/groceries/bulk-unarchive",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: (_result, _error, ids) => [
        { type: "Groceries", id: "LIST" },
        { type: "Groceries", id: "ANALYTICS" },
        { type: "Groceries", id: "HISTORY" },
        ...ids.map((id) => ({ type: "Groceries" as const, id })),
      ],
    }),

    // Bulk delete
    bulkDeleteGroceries: builder.mutation<BulkActionResponse, string[]>({
      query: (ids) => ({
        url: "/groceries/bulk-delete",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: [
        { type: "Groceries", id: "LIST" },
        { type: "Groceries", id: "ANALYTICS" },
        { type: "Groceries", id: "HISTORY" },
      ],
    }),

    // Parse text
    parseGroceryText: builder.mutation<ParseTextResponse, ParseTextRequest>({
      query: (body) => ({
        url: "/groceries/parse-text",
        method: "POST",
        body,
      }),
    }),

    // Parse voice recording
    parseGroceryVoice: builder.mutation<ParseTextResponse, FormData>({
      query: (formData) => ({
        url: "/groceries/parse-voice",
        method: "POST",
        body: formData,
      }),
    }),

    // Parse image (OCR) - not yet implemented on backend
    parseGroceryImage: builder.mutation<ParseTextResponse, FormData>({
      query: (formData) => ({
        url: "/groceries/parse-image",
        method: "POST",
        body: formData,
      }),
    }),

    // Parse receipt from URL
    parseReceiptUrl: builder.mutation<ParseTextResponse, ParseReceiptUrlRequest>({
      query: (body) => ({
        url: "/groceries/parse-receipt-url",
        method: "POST",
        body,
      }),
    }),

    // Get analytics
    getGroceryAnalytics: builder.query<GroceryAnalytics, void>({
      query: () => "/groceries/analytics",
      providesTags: [{ type: "Groceries", id: "ANALYTICS" }],
    }),

    // Get history
    getGroceryHistory: builder.query<GroceryHistory, number>({
      query: (months) => `/groceries/history?months=${months}`,
      providesTags: [{ type: "Groceries", id: "HISTORY" }],
    }),
  }),
});

export const {
  useGetGroceriesQuery,
  useGetGroceryQuery,
  useCreateGroceriesMutation,
  useUpdateGroceryMutation,
  useDeleteGroceryMutation,
  useBulkArchiveGroceriesMutation,
  useBulkUnarchiveGroceriesMutation,
  useBulkDeleteGroceriesMutation,
  useParseGroceryTextMutation,
  useParseGroceryVoiceMutation,
  useParseGroceryImageMutation,
  useParseReceiptUrlMutation,
  useGetGroceryAnalyticsQuery,
  useGetGroceryHistoryQuery,
} = groceriesApi;
