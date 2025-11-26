import { baseApi } from "./base-api";

export interface Grocery {
  id: string;
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
}

export interface GroceryFilters {
  search?: string;
  category?: string;
  store?: string;
  from_date?: string;
  to_date?: string;
  is_archived?: boolean;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface CreateGroceryInput {
  item_name: string;
  quantity?: number;
  unit?: string;
  category?: string;
  purchase_date?: string;
  expiry_date?: string;
  cost?: number;
  store?: string;
}

export interface UpdateGroceryInput extends Partial<CreateGroceryInput> {}

export interface GroceryAnalytics {
  total_items: number;
  items_this_week: number;
  expiring_soon: number;
  total_value: number;
  spending_by_category: Record<string, number>;
  spending_over_time: { date: string; amount: number }[];
  most_purchased: { item: string; count: number }[];
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
      providesTags: (result, error, id) => [{ type: "Groceries", id }],
    }),

    // Create groceries
    createGroceries: builder.mutation<Grocery[], CreateGroceryInput[]>({
      query: (items) => ({
        url: "/groceries",
        method: "POST",
        body: { items },
      }),
      invalidatesTags: [{ type: "Groceries", id: "LIST" }],
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
      invalidatesTags: (result, error, { id }) => [
        { type: "Groceries", id },
        { type: "Groceries", id: "LIST" },
      ],
    }),

    // Delete grocery
    deleteGrocery: builder.mutation<void, string>({
      query: (id) => ({
        url: `/groceries/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Groceries", id },
        { type: "Groceries", id: "LIST" },
      ],
    }),

    // Bulk archive
    bulkArchiveGroceries: builder.mutation<void, string[]>({
      query: (ids) => ({
        url: "/groceries/bulk-archive",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: [{ type: "Groceries", id: "LIST" }],
    }),

    // Bulk delete
    bulkDeleteGroceries: builder.mutation<void, string[]>({
      query: (ids) => ({
        url: "/groceries/bulk-delete",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: [{ type: "Groceries", id: "LIST" }],
    }),

    // Parse text (AI)
    parseGroceryText: builder.mutation<CreateGroceryInput[], string>({
      query: (text) => ({
        url: "/groceries/parse-text",
        method: "POST",
        body: { text },
      }),
    }),

    // Parse image (OCR)
    parseGroceryImage: builder.mutation<CreateGroceryInput[], FormData>({
      query: (formData) => ({
        url: "/groceries/parse-image",
        method: "POST",
        body: formData,
      }),
    }),

    // Get analytics
    getGroceryAnalytics: builder.query<GroceryAnalytics, void>({
      query: () => "/groceries/analytics",
      providesTags: [{ type: "Groceries", id: "ANALYTICS" }],
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
  useBulkDeleteGroceriesMutation,
  useParseGroceryTextMutation,
  useParseGroceryImageMutation,
  useGetGroceryAnalyticsQuery,
} = groceriesApi;
