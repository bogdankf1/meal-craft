type EventHandler<T = unknown> = (data: T) => void;

interface EventBus {
  subscribe: <T = unknown>(event: string, handler: EventHandler<T>) => () => void;
  emit: <T = unknown>(event: string, data?: T) => void;
}

function createEventBus(): EventBus {
  const handlers: Map<string, Set<EventHandler>> = new Map();

  return {
    subscribe<T = unknown>(event: string, handler: EventHandler<T>): () => void {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)!.add(handler as EventHandler);

      // Return unsubscribe function
      return () => {
        handlers.get(event)?.delete(handler as EventHandler);
      };
    },

    emit<T = unknown>(event: string, data?: T): void {
      handlers.get(event)?.forEach((handler) => handler(data));
    },
  };
}

// Global event bus instance
export const eventBus = createEventBus();

// Event name constants for type safety
export const Events = {
  // Groceries
  GROCERIES_ADDED: "groceries:added",
  GROCERIES_UPDATED: "groceries:updated",
  GROCERIES_DELETED: "groceries:deleted",

  // Recipes
  RECIPE_SAVED: "recipe:saved",
  RECIPE_UPDATED: "recipe:updated",
  RECIPE_DELETED: "recipe:deleted",
  RECIPE_GENERATED: "recipe:generated",

  // Meal Plans
  MEAL_PLAN_CREATED: "meal_plan:created",
  MEAL_PLAN_UPDATED: "meal_plan:updated",
  MEAL_PLAN_DELETED: "meal_plan:deleted",

  // Shopping Lists
  SHOPPING_LIST_CREATED: "shopping_list:created",
  SHOPPING_LIST_COMPLETED: "shopping_list:completed",
  SHOPPING_LIST_ITEM_PURCHASED: "shopping_list:item_purchased",

  // Pantry
  PANTRY_ITEM_ADDED: "pantry:item_added",
  PANTRY_ITEM_EXPIRING: "pantry:item_expiring",
  PANTRY_ITEM_LOW_STOCK: "pantry:item_low_stock",

  // Nutrition
  NUTRITION_GOAL_SET: "nutrition:goal_set",
  NUTRITION_LOG_ADDED: "nutrition:log_added",

  // Restaurants
  RESTAURANT_ORDER_ADDED: "restaurant:order_added",

  // User
  USER_TIER_CHANGED: "user:tier_changed",
  USER_SETTINGS_UPDATED: "user:settings_updated",
} as const;

// Hook for using event bus in React components
import { useEffect } from "react";

export function useEventBus<T = unknown>(
  event: string,
  handler: EventHandler<T>
): void {
  useEffect(() => {
    return eventBus.subscribe(event, handler);
  }, [event, handler]);
}
