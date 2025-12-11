import { baseApi } from "./base-api";

// Equipment category enum matching backend
export type EquipmentCategory =
  | "cookware"
  | "bakeware"
  | "appliances"
  | "knives_cutting"
  | "utensils"
  | "storage"
  | "small_tools"
  | "specialty"
  | "other";

export const EQUIPMENT_CATEGORIES: { value: EquipmentCategory; label: string }[] = [
  { value: "cookware", label: "Cookware" },
  { value: "bakeware", label: "Bakeware" },
  { value: "appliances", label: "Appliances" },
  { value: "knives_cutting", label: "Knives & Cutting" },
  { value: "utensils", label: "Utensils" },
  { value: "storage", label: "Storage" },
  { value: "small_tools", label: "Small Tools" },
  { value: "specialty", label: "Specialty" },
  { value: "other", label: "Other" },
];

// Equipment condition enum matching backend
export type EquipmentCondition =
  | "excellent"
  | "good"
  | "fair"
  | "needs_repair"
  | "replace_soon";

export const EQUIPMENT_CONDITIONS: { value: EquipmentCondition; label: string }[] = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "needs_repair", label: "Needs Repair" },
  { value: "replace_soon", label: "Replace Soon" },
];

// Equipment location enum matching backend
export type EquipmentLocation =
  | "kitchen_drawer"
  | "cabinet"
  | "countertop"
  | "pantry"
  | "storage"
  | "other";

export const EQUIPMENT_LOCATIONS: { value: EquipmentLocation; label: string }[] = [
  { value: "kitchen_drawer", label: "Kitchen Drawer" },
  { value: "cabinet", label: "Cabinet" },
  { value: "countertop", label: "Countertop" },
  { value: "pantry", label: "Pantry" },
  { value: "storage", label: "Storage" },
  { value: "other", label: "Other" },
];

export interface KitchenEquipment {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  brand: string | null;
  model: string | null;
  condition: string | null;
  location: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  last_maintenance_date: string | null;
  maintenance_interval_days: number | null;
  maintenance_notes: string | null;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  // Computed fields
  needs_maintenance: boolean;
  days_until_maintenance: number | null;
}

export interface KitchenEquipmentListResponse {
  items: KitchenEquipment[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface KitchenEquipmentFilters {
  search?: string;
  category?: string;
  condition?: string;
  location?: string;
  is_archived?: boolean;
  needs_maintenance?: boolean;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface CreateKitchenEquipmentInput {
  name: string;
  category?: EquipmentCategory | null;
  brand?: string | null;
  model?: string | null;
  condition?: EquipmentCondition;
  location?: EquipmentLocation;
  purchase_date?: string | null;
  purchase_price?: number | null;
  last_maintenance_date?: string | null;
  maintenance_interval_days?: number | null;
  maintenance_notes?: string | null;
  notes?: string | null;
}

export interface UpdateKitchenEquipmentInput {
  name?: string;
  category?: EquipmentCategory | null;
  brand?: string | null;
  model?: string | null;
  condition?: EquipmentCondition | null;
  location?: EquipmentLocation | null;
  purchase_date?: string | null;
  purchase_price?: number | null;
  last_maintenance_date?: string | null;
  maintenance_interval_days?: number | null;
  maintenance_notes?: string | null;
  notes?: string | null;
  is_archived?: boolean;
}

export interface EquipmentByCategory {
  category: string;
  count: number;
}

export interface EquipmentByCondition {
  condition: string;
  count: number;
}

export interface EquipmentByLocation {
  location: string;
  count: number;
}

export interface MaintenanceItem {
  id: string;
  name: string;
  category: string | null;
  last_maintenance_date: string | null;
  days_overdue: number;
  maintenance_notes: string | null;
}

export interface MaintenanceAnalytics {
  total_equipment: number;
  needs_maintenance: number;
  maintenance_rate: number;
  overdue_items: MaintenanceItem[];
  upcoming_items: MaintenanceItem[];
}

export interface KitchenEquipmentAnalytics {
  total_items: number;
  items_by_category: EquipmentByCategory[];
  items_by_condition: EquipmentByCondition[];
  items_by_location: EquipmentByLocation[];
  needs_maintenance: number;
  needs_repair: number;
  total_value: number;
  recently_added: KitchenEquipment[];
  maintenance: MaintenanceAnalytics;
}

export interface MonthlyEquipmentData {
  month: string;
  month_label: string;
  total_items: number;
  total_value: number;
  category_breakdown: Record<string, number>;
}

export interface KitchenEquipmentHistory {
  period_months: number;
  total_items: number;
  total_value: number;
  avg_monthly_items: number;
  monthly_data: MonthlyEquipmentData[];
  category_trends: Record<string, Record<string, number>>;
}

export interface BulkActionResponse {
  success: boolean;
  affected_count: number;
  message: string;
}

export interface RecordMaintenanceInput {
  maintenance_date: string;
  maintenance_notes?: string | null;
}

export interface BulkRecordMaintenanceInput {
  ids: string[];
  maintenance_date: string;
  maintenance_notes?: string | null;
}

export interface ParseTextRequest {
  text: string;
  default_category?: EquipmentCategory | null;
  default_location?: EquipmentLocation;
}

export interface ParseTextResponse {
  parsed_items: CreateKitchenEquipmentInput[];
  raw_text: string;
  success: boolean;
  message?: string;
}

export const kitchenEquipmentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // List kitchen equipment with filters
    getKitchenEquipment: builder.query<KitchenEquipmentListResponse, KitchenEquipmentFilters>({
      query: (params) => ({
        url: "/kitchen-equipment",
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "KitchenEquipment" as const,
                id,
              })),
              { type: "KitchenEquipment", id: "LIST" },
            ]
          : [{ type: "KitchenEquipment", id: "LIST" }],
    }),

    // Get single equipment item
    getKitchenEquipmentItem: builder.query<KitchenEquipment, string>({
      query: (id) => `/kitchen-equipment/${id}`,
      providesTags: (_result, _error, id) => [{ type: "KitchenEquipment", id }],
    }),

    // Create kitchen equipment (batch)
    createKitchenEquipment: builder.mutation<KitchenEquipment[], CreateKitchenEquipmentInput[]>({
      query: (items) => ({
        url: "/kitchen-equipment",
        method: "POST",
        body: { items },
      }),
      invalidatesTags: [
        { type: "KitchenEquipment", id: "LIST" },
        { type: "KitchenEquipment", id: "ANALYTICS" },
        { type: "KitchenEquipment", id: "HISTORY" },
        { type: "KitchenEquipment", id: "MAINTENANCE" },
      ],
    }),

    // Update kitchen equipment
    updateKitchenEquipment: builder.mutation<
      KitchenEquipment,
      { id: string; data: UpdateKitchenEquipmentInput }
    >({
      query: ({ id, data }) => ({
        url: `/kitchen-equipment/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "KitchenEquipment", id },
        { type: "KitchenEquipment", id: "LIST" },
        { type: "KitchenEquipment", id: "ANALYTICS" },
        { type: "KitchenEquipment", id: "HISTORY" },
        { type: "KitchenEquipment", id: "MAINTENANCE" },
      ],
    }),

    // Delete kitchen equipment
    deleteKitchenEquipment: builder.mutation<void, string>({
      query: (id) => ({
        url: `/kitchen-equipment/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "KitchenEquipment", id },
        { type: "KitchenEquipment", id: "LIST" },
        { type: "KitchenEquipment", id: "ANALYTICS" },
        { type: "KitchenEquipment", id: "HISTORY" },
        { type: "KitchenEquipment", id: "MAINTENANCE" },
      ],
    }),

    // Record maintenance
    recordMaintenance: builder.mutation<
      KitchenEquipment,
      { id: string; data: RecordMaintenanceInput }
    >({
      query: ({ id, data }) => ({
        url: `/kitchen-equipment/${id}/maintenance`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "KitchenEquipment", id },
        { type: "KitchenEquipment", id: "LIST" },
        { type: "KitchenEquipment", id: "ANALYTICS" },
        { type: "KitchenEquipment", id: "MAINTENANCE" },
      ],
    }),

    // Bulk record maintenance
    bulkRecordMaintenance: builder.mutation<BulkActionResponse, BulkRecordMaintenanceInput>({
      query: (body) => ({
        url: "/kitchen-equipment/bulk-maintenance",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { ids }) => [
        { type: "KitchenEquipment", id: "LIST" },
        { type: "KitchenEquipment", id: "ANALYTICS" },
        { type: "KitchenEquipment", id: "MAINTENANCE" },
        ...ids.map((id) => ({ type: "KitchenEquipment" as const, id })),
      ],
    }),

    // Bulk archive
    bulkArchiveKitchenEquipment: builder.mutation<BulkActionResponse, string[]>({
      query: (ids) => ({
        url: "/kitchen-equipment/bulk-archive",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: (_result, _error, ids) => [
        { type: "KitchenEquipment", id: "LIST" },
        { type: "KitchenEquipment", id: "ANALYTICS" },
        { type: "KitchenEquipment", id: "HISTORY" },
        { type: "KitchenEquipment", id: "MAINTENANCE" },
        ...ids.map((id) => ({ type: "KitchenEquipment" as const, id })),
      ],
    }),

    // Bulk unarchive
    bulkUnarchiveKitchenEquipment: builder.mutation<BulkActionResponse, string[]>({
      query: (ids) => ({
        url: "/kitchen-equipment/bulk-unarchive",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: (_result, _error, ids) => [
        { type: "KitchenEquipment", id: "LIST" },
        { type: "KitchenEquipment", id: "ANALYTICS" },
        { type: "KitchenEquipment", id: "HISTORY" },
        { type: "KitchenEquipment", id: "MAINTENANCE" },
        ...ids.map((id) => ({ type: "KitchenEquipment" as const, id })),
      ],
    }),

    // Bulk delete
    bulkDeleteKitchenEquipment: builder.mutation<BulkActionResponse, string[]>({
      query: (ids) => ({
        url: "/kitchen-equipment/bulk-delete",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: [
        { type: "KitchenEquipment", id: "LIST" },
        { type: "KitchenEquipment", id: "ANALYTICS" },
        { type: "KitchenEquipment", id: "HISTORY" },
        { type: "KitchenEquipment", id: "MAINTENANCE" },
      ],
    }),

    // Bulk update condition
    bulkUpdateCondition: builder.mutation<BulkActionResponse, { ids: string[]; condition: string }>({
      query: ({ ids, condition }) => ({
        url: `/kitchen-equipment/bulk-update-condition?condition=${condition}`,
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: (_result, _error, { ids }) => [
        { type: "KitchenEquipment", id: "LIST" },
        { type: "KitchenEquipment", id: "ANALYTICS" },
        ...ids.map((id) => ({ type: "KitchenEquipment" as const, id })),
      ],
    }),

    // Parse text
    parseKitchenEquipmentText: builder.mutation<ParseTextResponse, ParseTextRequest>({
      query: (body) => ({
        url: "/kitchen-equipment/parse-text",
        method: "POST",
        body,
      }),
    }),

    // Parse voice recording
    parseKitchenEquipmentVoice: builder.mutation<ParseTextResponse, FormData>({
      query: (formData) => ({
        url: "/kitchen-equipment/parse-voice",
        method: "POST",
        body: formData,
      }),
    }),

    // Parse image (photo of equipment, screenshot)
    parseKitchenEquipmentImage: builder.mutation<ParseTextResponse, FormData>({
      query: (formData) => ({
        url: "/kitchen-equipment/parse-image",
        method: "POST",
        body: formData,
      }),
    }),

    // Get analytics
    getKitchenEquipmentAnalytics: builder.query<KitchenEquipmentAnalytics, void>({
      query: () => "/kitchen-equipment/analytics/overview",
      providesTags: [{ type: "KitchenEquipment", id: "ANALYTICS" }],
    }),

    // Get maintenance overview
    getMaintenanceOverview: builder.query<MaintenanceAnalytics, void>({
      query: () => "/kitchen-equipment/maintenance/overview",
      providesTags: [{ type: "KitchenEquipment", id: "MAINTENANCE" }],
    }),

    // Get history
    getKitchenEquipmentHistory: builder.query<KitchenEquipmentHistory, number>({
      query: (months) => `/kitchen-equipment/history?months=${months}`,
      providesTags: [{ type: "KitchenEquipment", id: "HISTORY" }],
    }),
  }),
});

export const {
  useGetKitchenEquipmentQuery,
  useGetKitchenEquipmentItemQuery,
  useCreateKitchenEquipmentMutation,
  useUpdateKitchenEquipmentMutation,
  useDeleteKitchenEquipmentMutation,
  useRecordMaintenanceMutation,
  useBulkRecordMaintenanceMutation,
  useBulkArchiveKitchenEquipmentMutation,
  useBulkUnarchiveKitchenEquipmentMutation,
  useBulkDeleteKitchenEquipmentMutation,
  useBulkUpdateConditionMutation,
  useParseKitchenEquipmentTextMutation,
  useParseKitchenEquipmentVoiceMutation,
  useParseKitchenEquipmentImageMutation,
  useGetKitchenEquipmentAnalyticsQuery,
  useGetMaintenanceOverviewQuery,
  useGetKitchenEquipmentHistoryQuery,
} = kitchenEquipmentApi;
