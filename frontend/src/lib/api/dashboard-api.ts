/**
 * Dashboard API - aggregated data from all modules
 */
import { baseApi } from "./base-api";

// ==================== Stats Types ====================

export interface MealPlanStats {
  meals_planned_this_week: number;
  total_meal_slots: number;
  meals_planned_last_week: number;
  active_meal_plans: number;
}

export interface PantryStats {
  total_items: number;
  expiring_soon: number;
  expired: number;
  low_stock: number;
}

export interface RecipeStats {
  total_recipes: number;
  favorites: number;
  recipes_this_month: number;
  most_cooked_count: number;
}

export interface BudgetStats {
  spent_this_month: number;
  spent_last_month: number;
  average_monthly: number;
  currency: string;
}

export interface NutritionStats {
  calories_today: number;
  calories_goal: number;
  protein_today: number;
  protein_goal: number;
  carbs_today: number;
  carbs_goal: number;
  fat_today: number;
  fat_goal: number;
  goal_adherence_percent: number;
}

// ==================== Content Types ====================

export interface UpcomingMeal {
  id: string;
  date: string;
  meal_type: string;
  recipe_id?: string;
  recipe_name?: string;
  custom_meal_name?: string;
  is_leftover: boolean;
  profile_id?: string;
  profile_name?: string;
  profile_color?: string;
}

export interface ExpiringItem {
  id: string;
  name: string;
  expiry_date: string;
  days_until_expiry: number;
  quantity?: number;
  unit?: string;
  location?: string;
  source: "pantry" | "grocery";
}

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  icon: string;
  link?: string;
}

export interface WasteStats {
  wasted_this_month: number;
  wasted_last_month: number;
  waste_rate_percent: number;
  top_waste_reason?: string;
  estimated_cost_wasted: number;
}

export interface SkillProgress {
  id: string;
  name: string;
  category: string;
  proficiency: string;
  progress_percent: number;
  times_practiced: number;
}

export interface LearningPathProgress {
  id: string;
  name: string;
  skills_completed: number;
  total_skills: number;
  progress_percent: number;
}

export interface SeasonalItem {
  id: string;
  name: string;
  category: string;
  is_peak: boolean;
  nutrition_highlight?: string;
}

export interface EquipmentAlert {
  id: string;
  name: string;
  category: string;
  maintenance_type: "due" | "overdue";
  days_overdue?: number;
  last_maintenance?: string;
}

// ==================== Main Response ====================

export interface DashboardData {
  meal_plan_stats: MealPlanStats;
  pantry_stats: PantryStats;
  recipe_stats: RecipeStats;
  budget_stats: BudgetStats;
  nutrition_stats?: NutritionStats;
  upcoming_meals: UpcomingMeal[];
  expiring_items: ExpiringItem[];
  recent_activity: ActivityItem[];
  waste_stats: WasteStats;
  skills_in_progress: SkillProgress[];
  learning_paths: LearningPathProgress[];
  seasonal_items: SeasonalItem[];
  equipment_alerts: EquipmentAlert[];
  pending_shopping_lists: number;
  unread_support_messages: number;
}

// ==================== API ====================

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboard: builder.query<DashboardData, void>({
      query: () => "/dashboard",
      providesTags: [
        "Groceries",
        "Pantry",
        "Recipes",
        "MealPlans",
        "ShoppingLists",
        "Nutrition",
        "KitchenEquipment",
        "Skills",
        "UserSkills",
        "Seasonality",
      ],
    }),
  }),
  overrideExisting: false,
});

export const { useGetDashboardQuery } = dashboardApi;
