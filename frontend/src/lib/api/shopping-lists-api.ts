import { baseApi } from "./base-api";

// Shopping list status enum
export type ShoppingListStatus = "active" | "completed" | "archived";

// Item category enum (matches grocery categories)
export type ShoppingListItemCategory =
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

export const SHOPPING_LIST_CATEGORIES: { value: ShoppingListItemCategory; label: string }[] = [
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

// ==================== Item Types ====================

export interface ShoppingListItem {
  id: string;
  shopping_list_id: string;
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  is_purchased: boolean;
  created_at: string;
}

export interface CreateShoppingListItemInput {
  ingredient_name: string;
  quantity?: number | null;
  unit?: string | null;
  category?: ShoppingListItemCategory | null;
}

export interface UpdateShoppingListItemInput {
  ingredient_name?: string;
  quantity?: number | null;
  unit?: string | null;
  category?: ShoppingListItemCategory | null;
  is_purchased?: boolean;
}

// ==================== Shopping List Types ====================

export interface ShoppingList {
  id: string;
  user_id: string;
  name: string;
  status: string;
  estimated_cost: number | null;
  completed_at: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  items: ShoppingListItem[];
  total_items: number;
  purchased_items: number;
}

export interface ShoppingListSummary {
  id: string;
  user_id: string;
  name: string;
  status: string;
  estimated_cost: number | null;
  completed_at: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  total_items: number;
  purchased_items: number;
}

export interface ShoppingListListResponse {
  items: ShoppingListSummary[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ShoppingListFilters {
  search?: string;
  status?: ShoppingListStatus;
  is_archived?: boolean;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface CreateShoppingListInput {
  name: string;
  estimated_cost?: number | null;
  items?: CreateShoppingListItemInput[];
}

export interface UpdateShoppingListInput {
  name?: string;
  estimated_cost?: number | null;
  status?: ShoppingListStatus;
  is_archived?: boolean;
}

// ==================== Analytics Types ====================

export interface ShoppingListAnalytics {
  total_lists: number;
  active_lists: number;
  completed_lists: number;
  lists_this_week: number;
  lists_this_month: number;
  total_items_purchased: number;
  avg_items_per_list: number;
  avg_completion_rate: number;
  category_breakdown: Record<string, number>;
  completion_trend: Record<string, number>;
  recent_lists: ShoppingListSummary[];
}

export interface MonthlyShoppingData {
  month: string;
  month_label: string;
  total_lists: number;
  completed_lists: number;
  total_items: number;
  purchased_items: number;
  completion_rate: number;
  category_breakdown: Record<string, number>;
}

export interface TopShoppingItem {
  item_name: string;
  occurrence_count: number;
  purchase_count: number;
  last_added: string;
}

export interface ShoppingListHistory {
  period_months: number;
  total_lists: number;
  completed_lists: number;
  total_items: number;
  purchased_items: number;
  avg_monthly_lists: number;
  avg_completion_rate: number;
  monthly_data: MonthlyShoppingData[];
  top_items: TopShoppingItem[];
  category_trends: Record<string, Record<string, number>>;
}

// ==================== Suggestions Types ====================

export interface SuggestedItem {
  item_name: string;
  category: string | null;
  frequency: number;
  last_purchased: string | null;
  avg_quantity: number | null;
  common_unit: string | null;
}

export interface SuggestionsResponse {
  suggestions: SuggestedItem[];
  based_on_months: number;
}

// ==================== Bulk Action Types ====================

export interface BulkActionResponse {
  success: boolean;
  affected_count: number;
  message: string;
}

// ==================== Import/Parse Types ====================

export interface ParseShoppingListTextInput {
  text: string;
}

export interface ParsedShoppingListItem {
  ingredient_name: string;
  quantity?: number | null;
  unit?: string | null;
  category?: ShoppingListItemCategory | null;
}

export interface ParseShoppingListResponse {
  parsed_items: ParsedShoppingListItem[];
  raw_text?: string | null;
  success: boolean;
  message?: string | null;
}

export interface ToggleItemsInput {
  item_ids: string[];
  is_purchased: boolean;
}

// ==================== API Endpoints ====================

export const shoppingListsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // List shopping lists with filters
    getShoppingLists: builder.query<ShoppingListListResponse, ShoppingListFilters>({
      query: (params) => ({
        url: "/shopping-lists",
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "ShoppingLists" as const,
                id,
              })),
              { type: "ShoppingLists", id: "LIST" },
            ]
          : [{ type: "ShoppingLists", id: "LIST" }],
    }),

    // Get single shopping list with items
    getShoppingList: builder.query<ShoppingList, string>({
      query: (id) => `/shopping-lists/${id}`,
      providesTags: (_result, _error, id) => [{ type: "ShoppingLists", id }],
    }),

    // Create shopping list
    createShoppingList: builder.mutation<ShoppingList, CreateShoppingListInput>({
      query: (body) => ({
        url: "/shopping-lists",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "ShoppingLists", id: "LIST" },
        { type: "ShoppingLists", id: "ANALYTICS" },
        { type: "ShoppingLists", id: "HISTORY" },
      ],
    }),

    // Update shopping list
    updateShoppingList: builder.mutation<
      ShoppingList,
      { id: string; data: UpdateShoppingListInput }
    >({
      query: ({ id, data }) => ({
        url: `/shopping-lists/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "ShoppingLists", id },
        { type: "ShoppingLists", id: "LIST" },
        { type: "ShoppingLists", id: "ANALYTICS" },
        { type: "ShoppingLists", id: "HISTORY" },
      ],
    }),

    // Delete shopping list
    deleteShoppingList: builder.mutation<void, string>({
      query: (id) => ({
        url: `/shopping-lists/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "ShoppingLists", id },
        { type: "ShoppingLists", id: "LIST" },
        { type: "ShoppingLists", id: "ANALYTICS" },
        { type: "ShoppingLists", id: "HISTORY" },
      ],
    }),

    // Add items to list
    addItemsToList: builder.mutation<
      ShoppingListItem[],
      { listId: string; items: CreateShoppingListItemInput[] }
    >({
      query: ({ listId, items }) => ({
        url: `/shopping-lists/${listId}/items`,
        method: "POST",
        body: { items },
      }),
      invalidatesTags: (_result, _error, { listId }) => [
        { type: "ShoppingLists", id: listId },
        { type: "ShoppingLists", id: "LIST" },
        { type: "ShoppingLists", id: "ANALYTICS" },
      ],
    }),

    // Update item
    updateShoppingListItem: builder.mutation<
      ShoppingListItem,
      { listId: string; itemId: string; data: UpdateShoppingListItemInput }
    >({
      query: ({ listId, itemId, data }) => ({
        url: `/shopping-lists/${listId}/items/${itemId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { listId }) => [
        { type: "ShoppingLists", id: listId },
        { type: "ShoppingLists", id: "LIST" },
      ],
    }),

    // Delete item
    deleteShoppingListItem: builder.mutation<
      void,
      { listId: string; itemId: string }
    >({
      query: ({ listId, itemId }) => ({
        url: `/shopping-lists/${listId}/items/${itemId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { listId }) => [
        { type: "ShoppingLists", id: listId },
        { type: "ShoppingLists", id: "LIST" },
      ],
    }),

    // Toggle items purchased status
    toggleItemsPurchased: builder.mutation<
      BulkActionResponse,
      { listId: string; data: ToggleItemsInput }
    >({
      query: ({ listId, data }) => ({
        url: `/shopping-lists/${listId}/toggle-items`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { listId }) => [
        { type: "ShoppingLists", id: listId },
        { type: "ShoppingLists", id: "LIST" },
        { type: "ShoppingLists", id: "ANALYTICS" },
      ],
    }),

    // Bulk archive
    bulkArchiveShoppingLists: builder.mutation<BulkActionResponse, string[]>({
      query: (ids) => ({
        url: "/shopping-lists/bulk-archive",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: (_result, _error, ids) => [
        { type: "ShoppingLists", id: "LIST" },
        { type: "ShoppingLists", id: "ANALYTICS" },
        { type: "ShoppingLists", id: "HISTORY" },
        ...ids.map((id) => ({ type: "ShoppingLists" as const, id })),
      ],
    }),

    // Bulk unarchive
    bulkUnarchiveShoppingLists: builder.mutation<BulkActionResponse, string[]>({
      query: (ids) => ({
        url: "/shopping-lists/bulk-unarchive",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: (_result, _error, ids) => [
        { type: "ShoppingLists", id: "LIST" },
        { type: "ShoppingLists", id: "ANALYTICS" },
        { type: "ShoppingLists", id: "HISTORY" },
        ...ids.map((id) => ({ type: "ShoppingLists" as const, id })),
      ],
    }),

    // Bulk delete
    bulkDeleteShoppingLists: builder.mutation<BulkActionResponse, string[]>({
      query: (ids) => ({
        url: "/shopping-lists/bulk-delete",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: [
        { type: "ShoppingLists", id: "LIST" },
        { type: "ShoppingLists", id: "ANALYTICS" },
        { type: "ShoppingLists", id: "HISTORY" },
      ],
    }),

    // Bulk complete
    bulkCompleteShoppingLists: builder.mutation<BulkActionResponse, string[]>({
      query: (ids) => ({
        url: "/shopping-lists/bulk-complete",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: (_result, _error, ids) => [
        { type: "ShoppingLists", id: "LIST" },
        { type: "ShoppingLists", id: "ANALYTICS" },
        { type: "ShoppingLists", id: "HISTORY" },
        ...ids.map((id) => ({ type: "ShoppingLists" as const, id })),
      ],
    }),

    // Get analytics
    getShoppingListAnalytics: builder.query<ShoppingListAnalytics, void>({
      query: () => "/shopping-lists/analytics",
      providesTags: [{ type: "ShoppingLists", id: "ANALYTICS" }],
    }),

    // Get history
    getShoppingListHistory: builder.query<ShoppingListHistory, number>({
      query: (months) => `/shopping-lists/history?months=${months}`,
      providesTags: [{ type: "ShoppingLists", id: "HISTORY" }],
    }),

    // Get suggestions
    getShoppingListSuggestions: builder.query<
      SuggestionsResponse,
      { months?: number; limit?: number }
    >({
      query: ({ months = 3, limit = 20 }) =>
        `/shopping-lists/suggestions?months=${months}&limit=${limit}`,
    }),

    // ==================== Import/Parse Endpoints ====================

    // Parse shopping list items from text
    parseShoppingListText: builder.mutation<
      ParseShoppingListResponse,
      ParseShoppingListTextInput
    >({
      query: (body) => ({
        url: "/shopping-lists/parse-text",
        method: "POST",
        body,
      }),
    }),

    // Parse shopping list items from voice
    parseShoppingListVoice: builder.mutation<ParseShoppingListResponse, FormData>({
      query: (formData) => ({
        url: "/shopping-lists/parse-voice",
        method: "POST",
        body: formData,
      }),
    }),

    // Parse shopping list items from image
    parseShoppingListImage: builder.mutation<ParseShoppingListResponse, FormData>({
      query: (formData) => ({
        url: "/shopping-lists/parse-image",
        method: "POST",
        body: formData,
      }),
    }),
  }),
});

export const {
  useGetShoppingListsQuery,
  useGetShoppingListQuery,
  useCreateShoppingListMutation,
  useUpdateShoppingListMutation,
  useDeleteShoppingListMutation,
  useAddItemsToListMutation,
  useUpdateShoppingListItemMutation,
  useDeleteShoppingListItemMutation,
  useToggleItemsPurchasedMutation,
  useBulkArchiveShoppingListsMutation,
  useBulkUnarchiveShoppingListsMutation,
  useBulkDeleteShoppingListsMutation,
  useBulkCompleteShoppingListsMutation,
  useGetShoppingListAnalyticsQuery,
  useGetShoppingListHistoryQuery,
  useGetShoppingListSuggestionsQuery,
  useLazyGetShoppingListSuggestionsQuery,
  // Import/Parse hooks
  useParseShoppingListTextMutation,
  useParseShoppingListVoiceMutation,
  useParseShoppingListImageMutation,
} = shoppingListsApi;
