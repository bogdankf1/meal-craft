from fastapi import APIRouter

from app.api.v1.routes import auth, groceries, billing, ai, shopping_lists, pantry, kitchen_equipment, recipes, meal_plans, restaurants, nutrition

api_router = APIRouter()

# Authentication
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# Billing (Stripe subscriptions)
api_router.include_router(billing.router, prefix="/billing", tags=["Billing"])

# Groceries (Phase 1 module)
api_router.include_router(groceries.router, prefix="/groceries", tags=["Groceries"])

# Shopping Lists (Phase 2 module)
api_router.include_router(shopping_lists.router, prefix="/shopping-lists", tags=["Shopping Lists"])

# Pantry & Storage (Phase 3 module)
api_router.include_router(pantry.router, tags=["Pantry"])

# Kitchen Equipment (Phase 4 module)
api_router.include_router(kitchen_equipment.router, tags=["Kitchen Equipment"])

# Recipes (Phase 5 module)
api_router.include_router(recipes.router, tags=["Recipes"])

# Meal Plans (Phase 6 module)
api_router.include_router(meal_plans.router, tags=["Meal Plans"])

# AI Features (text parsing, categorization)
api_router.include_router(ai.router, tags=["AI"])

# Restaurants & Takeouts (Phase 7 module)
api_router.include_router(restaurants.router, prefix="/restaurants", tags=["Restaurants"])

# Nutrition (Phase 8 module)
api_router.include_router(nutrition.router, prefix="/nutrition", tags=["Nutrition"])
# api_router.include_router(subscription.router, prefix="/subscription", tags=["Subscription"])
# api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
