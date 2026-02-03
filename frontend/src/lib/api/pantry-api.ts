import { baseApi } from "./base-api";

// Storage location enum matching backend
export type StorageLocation =
  | "pantry"
  | "fridge"
  | "freezer"
  | "cabinet"
  | "spice_rack"
  | "other";

export const STORAGE_LOCATIONS: { value: StorageLocation; label: string }[] = [
  { value: "pantry", label: "Pantry" },
  { value: "fridge", label: "Fridge" },
  { value: "freezer", label: "Freezer" },
  { value: "cabinet", label: "Cabinet" },
  { value: "spice_rack", label: "Spice Rack" },
  { value: "other", label: "Other" },
];

// Pantry category enum matching backend
export type PantryCategory =
  | "produce"
  | "meat"
  | "seafood"
  | "dairy"
  | "bakery"
  | "frozen"
  | "canned"
  | "dry_goods"
  | "beverages"
  | "snacks"
  | "condiments"
  | "spices"
  | "oils"
  | "grains"
  | "pasta"
  | "cereals"
  | "baking"
  | "other";

export const PANTRY_CATEGORIES: { value: PantryCategory; label: string }[] = [
  { value: "produce", label: "Produce" },
  { value: "meat", label: "Meat" },
  { value: "seafood", label: "Seafood" },
  { value: "dairy", label: "Dairy" },
  { value: "bakery", label: "Bakery" },
  { value: "frozen", label: "Frozen" },
  { value: "canned", label: "Canned Goods" },
  { value: "dry_goods", label: "Dry Goods" },
  { value: "beverages", label: "Beverages" },
  { value: "snacks", label: "Snacks" },
  { value: "condiments", label: "Condiments" },
  { value: "spices", label: "Spices" },
  { value: "oils", label: "Oils & Vinegars" },
  { value: "grains", label: "Grains & Rice" },
  { value: "pasta", label: "Pasta & Noodles" },
  { value: "cereals", label: "Cereals" },
  { value: "baking", label: "Baking Supplies" },
  { value: "other", label: "Other" },
];

// Waste reason enum matching backend
export type PantryWasteReason =
  | "expired"
  | "spoiled"
  | "forgot"
  | "overcooked"
  | "didnt_like"
  | "too_much"
  | "other";

export const PANTRY_WASTE_REASONS: { value: PantryWasteReason; label: string }[] = [
  { value: "expired", label: "Expired" },
  { value: "spoiled", label: "Spoiled" },
  { value: "forgot", label: "Forgot about it" },
  { value: "overcooked", label: "Overcooked" },
  { value: "didnt_like", label: "Didn't like it" },
  { value: "too_much", label: "Had too much" },
  { value: "other", label: "Other" },
];

export interface PantryItem {
  id: string;
  user_id: string;
  item_name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  storage_location: StorageLocation;
  expiry_date: string | null;
  opened_date: string | null;
  minimum_quantity: number | null;
  notes: string | null;
  source_grocery_id: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  // Waste tracking fields
  is_wasted: boolean;
  wasted_at: string | null;
  waste_reason: string | null;
  waste_notes: string | null;
}

export interface PantryListResponse {
  items: PantryItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface PantryFilters {
  search?: string;
  category?: string;
  storage_location?: StorageLocation;
  expiring_within_days?: number;
  low_stock?: boolean;
  is_archived?: boolean;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface CreatePantryItemInput {
  item_name: string;
  quantity?: number | null;
  unit?: string | null;
  category?: PantryCategory | null;
  storage_location?: StorageLocation;
  expiry_date?: string | null;
  opened_date?: string | null;
  minimum_quantity?: number | null;
  notes?: string | null;
  source_grocery_id?: string | null;
}

export interface UpdatePantryItemInput {
  item_name?: string;
  quantity?: number | null;
  unit?: string | null;
  category?: PantryCategory | null;
  storage_location?: StorageLocation;
  expiry_date?: string | null;
  opened_date?: string | null;
  minimum_quantity?: number | null;
  notes?: string | null;
  is_archived?: boolean;
}

export interface PantryAnalytics {
  total_items: number;
  items_by_location: Record<string, number>;
  items_by_category: Record<string, number>;
  expiring_soon: number;
  expired: number;
  low_stock_items: number;
  recently_added: PantryItem[];
  expiring_items: PantryItem[];
  low_stock_list: PantryItem[];
}

export interface MonthlyPantryData {
  month: string;
  month_label: string;
  items_added: number;
  items_consumed: number;
  items_wasted: number;
  by_location: Record<string, number>;
  by_category: Record<string, number>;
}

export interface TopPantryItem {
  item_name: string;
  total_quantity: number;
  times_added: number;
  times_consumed: number;
  times_wasted: number;
  waste_rate: number;
}

export interface PantryHistory {
  period_months: number;
  total_items_added: number;
  total_items_consumed: number;
  total_items_wasted: number;
  monthly_data: MonthlyPantryData[];
  top_items: TopPantryItem[];
  location_trends: Record<string, Record<string, number>>;
  category_trends: Record<string, Record<string, number>>;
}

export interface BulkActionResponse {
  success: boolean;
  affected_count: number;
  message: string;
}

export interface ParseTextRequest {
  text: string;
}

export interface ParseTextResponse {
  parsed_items: CreatePantryItemInput[];
  raw_text: string;
  success: boolean;
  message?: string;
}

// Waste tracking types
export interface MarkAsWastedInput {
  waste_reason: PantryWasteReason;
  waste_notes?: string | null;
}

export interface BulkMarkAsWastedInput {
  ids: string[];
  waste_reason: PantryWasteReason;
  waste_notes?: string | null;
}

export interface WastedPantryItem {
  id: string;
  item_name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  storage_location: string;
  wasted_at: string;
  waste_reason: string;
  waste_notes: string | null;
}

export interface WasteByReason {
  reason: string;
  count: number;
}

export interface WasteByCategory {
  category: string;
  count: number;
}

export interface WasteByLocation {
  location: string;
  count: number;
}

export interface MonthlyWasteData {
  month: string;
  month_label: string;
  wasted_count: number;
  by_reason: Record<string, number>;
  by_category: Record<string, number>;
  by_location: Record<string, number>;
}

export interface PantryWasteAnalytics {
  total_wasted_items: number;
  wasted_this_week: number;
  wasted_this_month: number;
  waste_rate: number;
  by_reason: WasteByReason[];
  by_category: WasteByCategory[];
  by_location: WasteByLocation[];
  recent_wasted: WastedPantryItem[];
  monthly_trends: MonthlyWasteData[];
  suggestions: string[];
}

// Move to Pantry types (used from Groceries)
export interface MoveToPantryInput {
  storage_location?: StorageLocation;
  quantity?: number | null;
  notes?: string | null;
}

export interface BulkMoveToPantryInput {
  ids: string[];
  storage_location?: StorageLocation;
}

export interface MoveToPantryResponse {
  success: boolean;
  pantry_items_created: number;
  groceries_archived: number;
  message: string;
  pantry_item_ids: string[];
}

// ============ Pantry Transaction Types ============

export type PantryTransactionType = "add" | "deduct" | "waste" | "adjust" | "expire";

export interface PantryTransaction {
  id: string;
  user_id: string;
  pantry_item_id: string;
  transaction_type: PantryTransactionType;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  unit: string | null;
  source_type: string | null;
  source_id: string | null;
  notes: string | null;
  transaction_date: string;
  created_at: string;
  // Joined data
  item_name?: string;
}

export interface PantryTransactionListResponse {
  items: PantryTransaction[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface PantryTransactionFilters {
  transaction_type?: PantryTransactionType;
  source_type?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}

export interface AdjustPantryQuantityInput {
  quantity_change: number;
  notes?: string | null;
}

// ============ Recipe Availability Types ============

export interface IngredientAvailability {
  ingredient_name: string;
  needed_quantity: number;
  needed_unit: string | null;
  available_quantity: number;
  available_unit: string | null;
  is_available: boolean;
  is_partial: boolean;
  pantry_item_id: string | null;
  pantry_item_name: string | null;
}

export interface RecipeAvailability {
  recipe_id: string;
  recipe_name: string;
  servings_checked: number;
  can_make: boolean;
  available_servings: number;
  missing_count: number;
  partial_count: number;
  available_count: number;
  total_ingredients: number;
  ingredients: IngredientAvailability[];
}

export const pantryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // List pantry items with filters
    getPantryItems: builder.query<PantryListResponse, PantryFilters>({
      query: (params) => ({
        url: "/pantry",
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "Pantry" as const,
                id,
              })),
              { type: "Pantry", id: "LIST" },
            ]
          : [{ type: "Pantry", id: "LIST" }],
    }),

    // Get single pantry item
    getPantryItem: builder.query<PantryItem, string>({
      query: (id) => `/pantry/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Pantry", id }],
    }),

    // Create pantry items (batch)
    createPantryItems: builder.mutation<PantryItem[], CreatePantryItemInput[]>({
      query: (items) => ({
        url: "/pantry",
        method: "POST",
        body: { items },
      }),
      invalidatesTags: [
        { type: "Pantry", id: "LIST" },
        { type: "Pantry", id: "ANALYTICS" },
        { type: "Pantry", id: "HISTORY" },
      ],
    }),

    // Update pantry item
    updatePantryItem: builder.mutation<
      PantryItem,
      { id: string; data: UpdatePantryItemInput }
    >({
      query: ({ id, data }) => ({
        url: `/pantry/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Pantry", id },
        { type: "Pantry", id: "LIST" },
        { type: "Pantry", id: "ANALYTICS" },
        { type: "Pantry", id: "HISTORY" },
      ],
    }),

    // Delete pantry item
    deletePantryItem: builder.mutation<void, string>({
      query: (id) => ({
        url: `/pantry/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Pantry", id },
        { type: "Pantry", id: "LIST" },
        { type: "Pantry", id: "ANALYTICS" },
        { type: "Pantry", id: "HISTORY" },
      ],
    }),

    // Bulk archive
    bulkArchivePantryItems: builder.mutation<BulkActionResponse, string[]>({
      query: (ids) => ({
        url: "/pantry/bulk-archive",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: (_result, _error, ids) => [
        { type: "Pantry", id: "LIST" },
        { type: "Pantry", id: "ANALYTICS" },
        { type: "Pantry", id: "HISTORY" },
        ...ids.map((id) => ({ type: "Pantry" as const, id })),
      ],
    }),

    // Bulk unarchive
    bulkUnarchivePantryItems: builder.mutation<BulkActionResponse, string[]>({
      query: (ids) => ({
        url: "/pantry/bulk-unarchive",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: (_result, _error, ids) => [
        { type: "Pantry", id: "LIST" },
        { type: "Pantry", id: "ANALYTICS" },
        { type: "Pantry", id: "HISTORY" },
        ...ids.map((id) => ({ type: "Pantry" as const, id })),
      ],
    }),

    // Bulk delete
    bulkDeletePantryItems: builder.mutation<BulkActionResponse, string[]>({
      query: (ids) => ({
        url: "/pantry/bulk-delete",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: [
        { type: "Pantry", id: "LIST" },
        { type: "Pantry", id: "ANALYTICS" },
        { type: "Pantry", id: "HISTORY" },
      ],
    }),

    // Parse text
    parsePantryText: builder.mutation<ParseTextResponse, ParseTextRequest>({
      query: (body) => ({
        url: "/pantry/parse-text",
        method: "POST",
        body,
      }),
    }),

    // Parse voice recording
    parsePantryVoice: builder.mutation<ParseTextResponse, FormData>({
      query: (formData) => ({
        url: "/pantry/parse-voice",
        method: "POST",
        body: formData,
      }),
    }),

    // Parse image (photo of pantry, paper list, screenshot)
    parsePantryImage: builder.mutation<ParseTextResponse, FormData>({
      query: (formData) => ({
        url: "/pantry/parse-image",
        method: "POST",
        body: formData,
      }),
    }),

    // Get analytics
    getPantryAnalytics: builder.query<PantryAnalytics, void>({
      query: () => "/pantry/analytics/overview",
      providesTags: [{ type: "Pantry", id: "ANALYTICS" }],
    }),

    // Get history
    getPantryHistory: builder.query<PantryHistory, number>({
      query: (months) => `/pantry/history?months=${months}`,
      providesTags: [{ type: "Pantry", id: "HISTORY" }],
    }),

    // Mark as wasted
    markPantryItemAsWasted: builder.mutation<
      PantryItem,
      { id: string; data: MarkAsWastedInput }
    >({
      query: ({ id, data }) => ({
        url: `/pantry/${id}/waste`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Pantry", id },
        { type: "Pantry", id: "LIST" },
        { type: "Pantry", id: "ANALYTICS" },
        { type: "Pantry", id: "HISTORY" },
        { type: "Pantry", id: "WASTE_ANALYTICS" },
      ],
    }),

    // Bulk mark as wasted
    bulkMarkPantryItemsAsWasted: builder.mutation<BulkActionResponse, BulkMarkAsWastedInput>({
      query: (body) => ({
        url: "/pantry/bulk-waste",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { ids }) => [
        { type: "Pantry", id: "LIST" },
        { type: "Pantry", id: "ANALYTICS" },
        { type: "Pantry", id: "HISTORY" },
        { type: "Pantry", id: "WASTE_ANALYTICS" },
        ...ids.map((id) => ({ type: "Pantry" as const, id })),
      ],
    }),

    // Unmark as wasted
    unmarkPantryItemAsWasted: builder.mutation<PantryItem, string>({
      query: (id) => ({
        url: `/pantry/${id}/unwaste`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Pantry", id },
        { type: "Pantry", id: "LIST" },
        { type: "Pantry", id: "ANALYTICS" },
        { type: "Pantry", id: "HISTORY" },
        { type: "Pantry", id: "WASTE_ANALYTICS" },
      ],
    }),

    // Get waste analytics
    getPantryWasteAnalytics: builder.query<PantryWasteAnalytics, number>({
      query: (months = 3) => `/pantry/waste/analytics?months=${months}`,
      providesTags: [{ type: "Pantry", id: "WASTE_ANALYTICS" }],
    }),

    // Move grocery to pantry (called from groceries)
    moveGroceryToPantry: builder.mutation<
      MoveToPantryResponse,
      { groceryId: string; data: MoveToPantryInput }
    >({
      query: ({ groceryId, data }) => ({
        url: `/groceries/${groceryId}/move-to-pantry`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "Pantry", id: "LIST" },
        { type: "Pantry", id: "ANALYTICS" },
        { type: "Groceries", id: "LIST" },
        { type: "Groceries", id: "ANALYTICS" },
      ],
    }),

    // Bulk move groceries to pantry
    bulkMoveGroceriesToPantry: builder.mutation<MoveToPantryResponse, BulkMoveToPantryInput>({
      query: (body) => ({
        url: "/groceries/bulk-move-to-pantry",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Pantry", id: "LIST" },
        { type: "Pantry", id: "ANALYTICS" },
        { type: "Groceries", id: "LIST" },
        { type: "Groceries", id: "ANALYTICS" },
      ],
    }),

    // ============ Pantry Transactions ============

    // Get all pantry transactions
    getPantryTransactions: builder.query<PantryTransactionListResponse, PantryTransactionFilters>({
      query: (params) => ({
        url: "/pantry/transactions/all",
        params,
      }),
      providesTags: [{ type: "Pantry", id: "TRANSACTIONS" }],
    }),

    // Get transactions for a specific pantry item
    getPantryItemTransactions: builder.query<
      PantryTransactionListResponse,
      { itemId: string; page?: number; per_page?: number }
    >({
      query: ({ itemId, ...params }) => ({
        url: `/pantry/${itemId}/transactions`,
        params,
      }),
      providesTags: (_result, _error, { itemId }) => [
        { type: "Pantry", id: `TRANSACTIONS_${itemId}` },
      ],
    }),

    // Manually adjust pantry quantity
    adjustPantryQuantity: builder.mutation<
      PantryTransaction,
      { itemId: string; data: AdjustPantryQuantityInput }
    >({
      query: ({ itemId, data }) => ({
        url: `/pantry/${itemId}/adjust`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { itemId }) => [
        { type: "Pantry", id: itemId },
        { type: "Pantry", id: "LIST" },
        { type: "Pantry", id: "ANALYTICS" },
        { type: "Pantry", id: "TRANSACTIONS" },
        { type: "Pantry", id: `TRANSACTIONS_${itemId}` },
      ],
    }),
  }),
});

export const {
  useGetPantryItemsQuery,
  useGetPantryItemQuery,
  useCreatePantryItemsMutation,
  useUpdatePantryItemMutation,
  useDeletePantryItemMutation,
  useBulkArchivePantryItemsMutation,
  useBulkUnarchivePantryItemsMutation,
  useBulkDeletePantryItemsMutation,
  useParsePantryTextMutation,
  useParsePantryVoiceMutation,
  useParsePantryImageMutation,
  useGetPantryAnalyticsQuery,
  useGetPantryHistoryQuery,
  // Waste tracking hooks
  useMarkPantryItemAsWastedMutation,
  useBulkMarkPantryItemsAsWastedMutation,
  useUnmarkPantryItemAsWastedMutation,
  useGetPantryWasteAnalyticsQuery,
  // Move to pantry hooks
  useMoveGroceryToPantryMutation,
  useBulkMoveGroceriesToPantryMutation,
  // Transaction hooks
  useGetPantryTransactionsQuery,
  useGetPantryItemTransactionsQuery,
  useAdjustPantryQuantityMutation,
} = pantryApi;
