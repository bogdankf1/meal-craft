import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SubscriptionTier = "HOME_COOK" | "CHEFS_CHOICE" | "MASTER_CHEF";
export type UserRole = "USER" | "ADMIN";
export type { UIVisibility };

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
}

interface UserPreferences {
  locale: "en" | "uk";
  theme: "light" | "dark" | "system";
  units: "metric" | "imperial";
  defaultServings: number;
  firstDayOfWeek: "monday" | "sunday";
  dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY";
  uiVisibility: UIVisibility;
}

interface UserState {
  tier: SubscriptionTier;
  role: UserRole;
  preferences: UserPreferences;
  setTier: (tier: SubscriptionTier) => void;
  setRole: (role: UserRole) => void;
  setPreferences: (preferences: Partial<UserPreferences>) => void;
  setUIVisibility: (visibility: Partial<UIVisibility>) => void;
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
};

const defaultPreferences: UserPreferences = {
  locale: "en",
  theme: "system",
  units: "metric",
  defaultServings: 2,
  firstDayOfWeek: "monday",
  dateFormat: "DD/MM/YYYY",
  uiVisibility: defaultUIVisibility,
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      tier: "HOME_COOK",
      role: "USER",
      preferences: defaultPreferences,

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
              ...state.preferences.uiVisibility,
              ...visibility,
            },
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
