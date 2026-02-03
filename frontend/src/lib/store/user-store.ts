import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SubscriptionTier = "HOME_COOK" | "CHEFS_CHOICE" | "MASTER_CHEF";
export type UserRole = "USER" | "ADMIN";
export type { UIVisibility, ColumnVisibility };

// Column visibility types for each module
interface RecipesColumnVisibility {
  name: boolean;
  category: boolean;
  cuisine_type: boolean;
  time: boolean;
  servings: boolean;
  difficulty: boolean;
  availability: boolean;
  rating: boolean;
  times_cooked: boolean;
  created_at: boolean;
}

interface GroceriesColumnVisibility {
  item_name: boolean;
  category: boolean;
  quantity: boolean;
  purchase_date: boolean;
  expiry_date: boolean;
  cost: boolean;
  store: boolean;
}

interface PantryColumnVisibility {
  item_name: boolean;
  storage_location: boolean;
  category: boolean;
  quantity: boolean;
  expiry_date: boolean;
  created_at: boolean;
}

interface MealPlansColumnVisibility {
  name: boolean;
  date_range: boolean;
  meals: boolean;
  servings: boolean;
  status: boolean;
}

interface ShoppingListsColumnVisibility {
  name: boolean;
  status: boolean;
  progress: boolean;
  estimated_cost: boolean;
  created_at: boolean;
  completed_at: boolean;
}

interface RestaurantMealsColumnVisibility {
  restaurant: boolean;
  date: boolean;
  meal_type: boolean;
  order_type: boolean;
  items: boolean;
  rating: boolean;
  feeling: boolean;
}

interface KitchenEquipmentColumnVisibility {
  name: boolean;
  category: boolean;
  brand: boolean;
  condition: boolean;
  location: boolean;
  maintenance: boolean;
  created_at: boolean;
}

interface ColumnVisibility {
  recipes: RecipesColumnVisibility;
  groceries: GroceriesColumnVisibility;
  pantry: PantryColumnVisibility;
  mealPlans: MealPlansColumnVisibility;
  shoppingLists: ShoppingListsColumnVisibility;
  restaurantMeals: RestaurantMealsColumnVisibility;
  kitchenEquipment: KitchenEquipmentColumnVisibility;
}

interface UIVisibility {
  showStatsCards: boolean;
  showSearchBar: boolean;
  showFilters: boolean;
  showDateRange: boolean;
  showViewSelector: boolean;
  showSorting: boolean;
  showPageTitle: boolean;
  showPageSubtitle: boolean;
  showInsights: boolean;
  showColumnSelector: boolean;
  // Common tabs
  showArchiveTab: boolean;
  showWasteTab: boolean;
  showAnalysisTab: boolean;
  showHistoryTab: boolean;
  // Module-specific tabs
  showMaintenanceTab: boolean; // Kitchen Equipment
  showGoalsTab: boolean; // Nutrition
  showSeasonalCalendarTab: boolean; // Seasonality
  showLocalSpecialtiesTab: boolean; // Seasonality
  showThisMonthTab: boolean; // Seasonality
  showMySkillsTab: boolean; // Learning
  showLibraryTab: boolean; // Learning
  showLearningPathsTab: boolean; // Learning
  showCollectionsTab: boolean; // Recipes
  // Sidebar navigation - Planning
  showSidebarMealPlanner: boolean;
  showSidebarRecipes: boolean;
  showSidebarShoppingLists: boolean;
  // Sidebar navigation - Inventory
  showSidebarGroceries: boolean;
  showSidebarPantry: boolean;
  showSidebarKitchenEquipment: boolean;
  // Sidebar navigation - Tracking
  showSidebarRestaurants: boolean;
  showSidebarNutrition: boolean;
  // Sidebar navigation - Lifestyle
  showSidebarSeasonality: boolean;
  showSidebarLearning: boolean;
  // Sidebar navigation - Tools
  showSidebarExport: boolean;
  showSidebarBackups: boolean;
  showSidebarHelp: boolean;
  // Dashboard content
  showDashboardStats: boolean;
  showDashboardUpcomingMeals: boolean;
  showDashboardExpiringSoon: boolean;
  showDashboardRecentActivity: boolean;
  showDashboardQuickActions: boolean;
  showDashboardWasteAnalytics: boolean;
  showDashboardSkillsProgress: boolean;
  showDashboardSeasonalInsights: boolean;
  showDashboardNutrition: boolean;
  // Touch gestures
  enableSidebarSwipeGesture: boolean;
}

interface UserPreferences {
  locale: "en" | "uk";
  theme: "light" | "dark" | "system";
  units: "metric" | "imperial";
  defaultServings: number;
  firstDayOfWeek: "monday" | "sunday";
  dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY";
  uiVisibility: UIVisibility;
  columnVisibility: ColumnVisibility;
}

interface UserState {
  tier: SubscriptionTier;
  role: UserRole;
  preferences: UserPreferences;
  minimalView: boolean;
  setTier: (tier: SubscriptionTier) => void;
  setRole: (role: UserRole) => void;
  setPreferences: (preferences: Partial<UserPreferences>) => void;
  setUIVisibility: (visibility: Partial<UIVisibility>) => void;
  setColumnVisibility: <T extends keyof ColumnVisibility>(
    module: T,
    visibility: Partial<ColumnVisibility[T]>
  ) => void;
  toggleMinimalView: (enabled: boolean) => void;
  hasFeature: (feature: "PLUS" | "PRO") => boolean;
  isAdmin: () => boolean;
}

const defaultUIVisibility: UIVisibility = {
  showStatsCards: true,
  showSearchBar: true,
  showFilters: true,
  showDateRange: true,
  showViewSelector: true,
  showSorting: true,
  showPageTitle: true,
  showPageSubtitle: true,
  showInsights: true,
  showColumnSelector: true,
  // Common tabs
  showArchiveTab: true,
  showWasteTab: true,
  showAnalysisTab: true,
  showHistoryTab: true,
  // Module-specific tabs
  showMaintenanceTab: true,
  showGoalsTab: true,
  showSeasonalCalendarTab: true,
  showLocalSpecialtiesTab: true,
  showThisMonthTab: true,
  showMySkillsTab: true,
  showLibraryTab: true,
  showLearningPathsTab: true,
  showCollectionsTab: true,
  // Sidebar navigation - Planning
  showSidebarMealPlanner: true,
  showSidebarRecipes: true,
  showSidebarShoppingLists: true,
  // Sidebar navigation - Inventory
  showSidebarGroceries: true,
  showSidebarPantry: true,
  showSidebarKitchenEquipment: true,
  // Sidebar navigation - Tracking
  showSidebarRestaurants: true,
  showSidebarNutrition: true,
  // Sidebar navigation - Lifestyle
  showSidebarSeasonality: true,
  showSidebarLearning: true,
  // Sidebar navigation - Tools
  showSidebarExport: true,
  showSidebarBackups: true,
  showSidebarHelp: true,
  // Dashboard content
  showDashboardStats: true,
  showDashboardUpcomingMeals: true,
  showDashboardExpiringSoon: true,
  showDashboardRecentActivity: true,
  showDashboardQuickActions: true,
  showDashboardWasteAnalytics: true,
  showDashboardSkillsProgress: true,
  showDashboardSeasonalInsights: true,
  showDashboardNutrition: true,
  // Touch gestures
  enableSidebarSwipeGesture: false,
};

// Minimal UI visibility preset (hides most UI elements for a cleaner view)
export const minimalUIVisibility: UIVisibility = {
  showStatsCards: false,
  showSearchBar: true, // Keep search functional
  showFilters: false,
  showDateRange: false,
  showViewSelector: false,
  showSorting: false,
  showPageTitle: true, // Keep page context
  showPageSubtitle: false,
  showInsights: false,
  showColumnSelector: false,
  // Common tabs
  showArchiveTab: false,
  showWasteTab: false,
  showAnalysisTab: false,
  showHistoryTab: false,
  // Module-specific tabs
  showMaintenanceTab: false,
  showGoalsTab: false,
  showSeasonalCalendarTab: false,
  showLocalSpecialtiesTab: false,
  showThisMonthTab: false,
  showMySkillsTab: false,
  showLibraryTab: false,
  showLearningPathsTab: false,
  showCollectionsTab: false,
  // Sidebar navigation - Planning (keep core navigation)
  showSidebarMealPlanner: true,
  showSidebarRecipes: true,
  showSidebarShoppingLists: true,
  // Sidebar navigation - Inventory
  showSidebarGroceries: true,
  showSidebarPantry: true,
  showSidebarKitchenEquipment: false,
  // Sidebar navigation - Tracking
  showSidebarRestaurants: false,
  showSidebarNutrition: true,
  // Sidebar navigation - Lifestyle
  showSidebarSeasonality: false,
  showSidebarLearning: false,
  // Sidebar navigation - Tools
  showSidebarExport: false,
  showSidebarBackups: false,
  showSidebarHelp: false,
  // Dashboard content
  showDashboardStats: false,
  showDashboardUpcomingMeals: true,
  showDashboardExpiringSoon: true,
  showDashboardRecentActivity: false,
  showDashboardQuickActions: true,
  showDashboardWasteAnalytics: false,
  showDashboardSkillsProgress: false,
  showDashboardSeasonalInsights: false,
  showDashboardNutrition: false,
  // Touch gestures
  enableSidebarSwipeGesture: false,
};

// Minimal column visibility preset
export const minimalColumnVisibility: ColumnVisibility = {
  recipes: {
    name: true,
    category: true,
    cuisine_type: true,
    time: true,
    servings: false,
    difficulty: false,
    availability: false,
    rating: false,
    times_cooked: false,
    created_at: false,
  },
  groceries: {
    item_name: true,
    category: true,
    quantity: true,
    purchase_date: false,
    expiry_date: false,
    cost: false,
    store: false,
  },
  pantry: {
    item_name: true,
    storage_location: true,
    category: true,
    quantity: true,
    expiry_date: false,
    created_at: false,
  },
  mealPlans: {
    name: true,
    date_range: true,
    meals: true,
    servings: false,
    status: false,
  },
  shoppingLists: {
    name: true,
    status: true,
    progress: true,
    estimated_cost: false,
    created_at: false,
    completed_at: false,
  },
  restaurantMeals: {
    restaurant: true,
    date: true,
    meal_type: true,
    order_type: false,
    items: false,
    rating: false,
    feeling: false,
  },
  kitchenEquipment: {
    name: true,
    category: true,
    brand: false,
    condition: false,
    location: false,
    maintenance: false,
    created_at: false,
  },
};

export const defaultColumnVisibility: ColumnVisibility = {
  recipes: {
    name: true,
    category: true,
    cuisine_type: true,
    time: true,
    servings: true,
    difficulty: true,
    availability: false, // Default to false since it requires on-demand API calls
    rating: true,
    times_cooked: true,
    created_at: true,
  },
  groceries: {
    item_name: true,
    category: true,
    quantity: true,
    purchase_date: true,
    expiry_date: true,
    cost: true,
    store: true,
  },
  pantry: {
    item_name: true,
    storage_location: true,
    category: true,
    quantity: true,
    expiry_date: true,
    created_at: true,
  },
  mealPlans: {
    name: true,
    date_range: true,
    meals: true,
    servings: true,
    status: true,
  },
  shoppingLists: {
    name: true,
    status: true,
    progress: true,
    estimated_cost: true,
    created_at: true,
    completed_at: true,
  },
  restaurantMeals: {
    restaurant: true,
    date: true,
    meal_type: true,
    order_type: true,
    items: true,
    rating: true,
    feeling: true,
  },
  kitchenEquipment: {
    name: true,
    category: true,
    brand: true,
    condition: true,
    location: true,
    maintenance: true,
    created_at: true,
  },
};

const defaultPreferences: UserPreferences = {
  locale: "en",
  theme: "system",
  units: "metric",
  defaultServings: 2,
  firstDayOfWeek: "monday",
  dateFormat: "DD/MM/YYYY",
  uiVisibility: defaultUIVisibility,
  columnVisibility: defaultColumnVisibility,
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      tier: "HOME_COOK",
      role: "USER",
      preferences: defaultPreferences,
      minimalView: false,

      setTier: (tier) => set({ tier }),
      setRole: (role) => set({ role }),

      setPreferences: (newPreferences) =>
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences },
        })),

      setUIVisibility: (visibility) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            uiVisibility: {
              ...(state.preferences.uiVisibility ?? defaultUIVisibility),
              ...visibility,
            },
          },
        })),

      setColumnVisibility: (module, visibility) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            columnVisibility: {
              ...(state.preferences.columnVisibility ?? defaultColumnVisibility),
              [module]: {
                ...((state.preferences.columnVisibility?.[module]) ?? defaultColumnVisibility[module]),
                ...visibility,
              },
            },
          },
        })),

      toggleMinimalView: (enabled) =>
        set((state) => ({
          minimalView: enabled,
          preferences: {
            ...state.preferences,
            uiVisibility: enabled ? minimalUIVisibility : defaultUIVisibility,
            columnVisibility: enabled ? minimalColumnVisibility : defaultColumnVisibility,
          },
        })),

      hasFeature: (requiredTier) => {
        const tierHierarchy = {
          HOME_COOK: 0,
          CHEFS_CHOICE: 1,
          MASTER_CHEF: 2,
        };
        const requiredTierMap = {
          PLUS: "CHEFS_CHOICE" as const,
          PRO: "MASTER_CHEF" as const,
        };
        return (
          tierHierarchy[get().tier] >= tierHierarchy[requiredTierMap[requiredTier]]
        );
      },

      isAdmin: () => get().role === "ADMIN",
    }),
    {
      name: "mealcraft-user",
    }
  )
);
