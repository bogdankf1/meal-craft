from typing import Callable, Dict, List, Any
import asyncio
from dataclasses import dataclass
from datetime import datetime


@dataclass
class Event:
    name: str
    data: Any
    timestamp: datetime = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()


class EventBus:
    """
    Simple event bus for inter-module communication.

    Events follow the pattern: "module:action"
    Examples:
        - groceries:added
        - recipe:saved
        - meal_plan:updated
        - shopping_list:completed
    """

    def __init__(self):
        self._handlers: Dict[str, List[Callable]] = {}

    def subscribe(self, event_name: str, handler: Callable) -> None:
        """Subscribe a handler to an event."""
        if event_name not in self._handlers:
            self._handlers[event_name] = []
        self._handlers[event_name].append(handler)

    def unsubscribe(self, event_name: str, handler: Callable) -> None:
        """Unsubscribe a handler from an event."""
        if event_name in self._handlers:
            self._handlers[event_name].remove(handler)

    async def emit(self, event_name: str, data: Any = None) -> None:
        """Emit an event to all subscribed handlers."""
        event = Event(name=event_name, data=data)

        if event_name in self._handlers:
            for handler in self._handlers[event_name]:
                if asyncio.iscoroutinefunction(handler):
                    await handler(event)
                else:
                    handler(event)

    def emit_sync(self, event_name: str, data: Any = None) -> None:
        """Emit an event synchronously (use emit() for async handlers)."""
        event = Event(name=event_name, data=data)

        if event_name in self._handlers:
            for handler in self._handlers[event_name]:
                if not asyncio.iscoroutinefunction(handler):
                    handler(event)


# Global event bus instance
event_bus = EventBus()


# Event name constants
class Events:
    # Groceries
    GROCERIES_ADDED = "groceries:added"
    GROCERIES_UPDATED = "groceries:updated"
    GROCERIES_DELETED = "groceries:deleted"

    # Recipes
    RECIPE_SAVED = "recipe:saved"
    RECIPE_UPDATED = "recipe:updated"
    RECIPE_DELETED = "recipe:deleted"
    RECIPE_GENERATED = "recipe:generated"

    # Meal Plans
    MEAL_PLAN_CREATED = "meal_plan:created"
    MEAL_PLAN_UPDATED = "meal_plan:updated"
    MEAL_PLAN_DELETED = "meal_plan:deleted"

    # Shopping Lists
    SHOPPING_LIST_CREATED = "shopping_list:created"
    SHOPPING_LIST_COMPLETED = "shopping_list:completed"
    SHOPPING_LIST_ITEM_PURCHASED = "shopping_list:item_purchased"

    # Pantry
    PANTRY_ITEM_ADDED = "pantry:item_added"
    PANTRY_ITEM_EXPIRING = "pantry:item_expiring"
    PANTRY_ITEM_LOW_STOCK = "pantry:item_low_stock"

    # Nutrition
    NUTRITION_GOAL_SET = "nutrition:goal_set"
    NUTRITION_LOG_ADDED = "nutrition:log_added"

    # Restaurants
    RESTAURANT_ORDER_ADDED = "restaurant:order_added"

    # User
    USER_TIER_CHANGED = "user:tier_changed"
    USER_SETTINGS_UPDATED = "user:settings_updated"
