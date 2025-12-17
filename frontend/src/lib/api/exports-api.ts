import { baseApi } from "./base-api";

export type ExportFormat = "csv";

export type EntryType =
  | "groceries"
  | "pantry"
  | "shopping_lists"
  | "recipes"
  | "meal_plans"
  | "kitchen_equipment"
  | "restaurants"
  | "restaurant_meals"
  | "nutrition_logs"
  | "nutrition_goals"
  | "health_metrics"
  | "user_skills"
  | "cooking_history"
  | "recipe_collections";

export interface ExportRequest {
  entry_type: EntryType;
  format: ExportFormat;
  start_date?: string | null;
  end_date?: string | null;
}

export interface ExportResponse {
  success: boolean;
  message: string;
  filename: string;
  row_count: number;
}

export const exportsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    exportData: builder.mutation<ExportResponse, ExportRequest>({
      query: (data) => ({
        url: "/exports/",
        method: "POST",
        body: data,
      }),
    }),
    downloadExport: builder.mutation<Blob, ExportRequest>({
      query: (data) => ({
        url: "/exports/download",
        method: "POST",
        body: data,
        responseHandler: (response) => response.blob(),
        cache: "no-cache",
      }),
    }),
  }),
});

export const { useExportDataMutation, useDownloadExportMutation } = exportsApi;
