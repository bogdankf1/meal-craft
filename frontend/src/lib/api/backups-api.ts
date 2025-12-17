import { baseApi } from "./base-api";

export type ModuleType =
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

export interface BackupCreate {
  module_type: ModuleType;
}

export interface Backup {
  id: string;
  user_id: string;
  module_type: ModuleType;
  created_at: string;
  item_count: number;
}

export interface BackupRestoreResponse {
  success: boolean;
  message: string;
  restored_count: number;
}

// Map module types to their RTK Query cache tags
const MODULE_TAG_MAP: Record<ModuleType, string[]> = {
  groceries: ["Groceries"],
  pantry: ["Pantry"],
  shopping_lists: ["ShoppingLists"],
  recipes: ["Recipes"],
  meal_plans: ["MealPlans"],
  kitchen_equipment: ["KitchenEquipment"],
  restaurants: ["Restaurants"],
  restaurant_meals: ["RestaurantMeals"],
  nutrition_logs: ["Nutrition"],
  nutrition_goals: ["Nutrition"],
  health_metrics: ["Health"],
  user_skills: ["UserSkills"],
  cooking_history: ["Recipes"],
  recipe_collections: ["Recipes"],
};

export const backupsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createBackup: builder.mutation<Backup, BackupCreate>({
      query: (data) => ({
        url: "/backups",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Backup" as never],
    }),
    getBackups: builder.query<Backup[], void>({
      query: () => "/backups",
      providesTags: ["Backup" as never],
    }),
    restoreBackup: builder.mutation<
      BackupRestoreResponse,
      { backupId: string; moduleType: ModuleType }
    >({
      query: ({ backupId }) => ({
        url: `/backups/${backupId}/restore`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, { moduleType }) => {
        const tags = MODULE_TAG_MAP[moduleType] || [];
        return tags as never[];
      },
    }),
    deleteBackup: builder.mutation<void, string>({
      query: (backupId) => ({
        url: `/backups/${backupId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Backup" as never],
    }),
  }),
});

export const {
  useCreateBackupMutation,
  useGetBackupsQuery,
  useRestoreBackupMutation,
  useDeleteBackupMutation,
} = backupsApi;
