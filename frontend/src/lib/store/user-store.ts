import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SubscriptionTier = "HOME_COOK" | "CHEFS_CHOICE" | "MASTER_CHEF";
export type UserRole = "USER" | "ADMIN";

interface UserPreferences {
  locale: "en" | "uk";
  theme: "light" | "dark" | "system";
  units: "metric" | "imperial";
  defaultServings: number;
  firstDayOfWeek: "monday" | "sunday";
  dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY";
}

interface UserState {
  tier: SubscriptionTier;
  role: UserRole;
  preferences: UserPreferences;
  setTier: (tier: SubscriptionTier) => void;
  setRole: (role: UserRole) => void;
  setPreferences: (preferences: Partial<UserPreferences>) => void;
  hasFeature: (feature: "PLUS" | "PRO") => boolean;
  isAdmin: () => boolean;
}

const defaultPreferences: UserPreferences = {
  locale: "en",
  theme: "system",
  units: "metric",
  defaultServings: 2,
  firstDayOfWeek: "monday",
  dateFormat: "DD/MM/YYYY",
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
