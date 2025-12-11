from fastapi import APIRouter

from app.api.v1.routes import auth, groceries, billing, ai, shopping_lists, pantry

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

# AI Features (text parsing, categorization)
api_router.include_router(ai.router, tags=["AI"])

# TODO: Add more routes as modules are implemented
# api_router.include_router(recipes.router, prefix="/recipes", tags=["Recipes"])
# api_router.include_router(meal_plans.router, prefix="/meal-plans", tags=["Meal Plans"])
# api_router.include_router(restaurants.router, prefix="/restaurants", tags=["Restaurants"])
# api_router.include_router(nutrition.router, prefix="/nutrition", tags=["Nutrition"])
# api_router.include_router(subscription.router, prefix="/subscription", tags=["Subscription"])
# api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
