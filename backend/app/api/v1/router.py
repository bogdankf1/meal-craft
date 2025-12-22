from fastapi import APIRouter

from app.api.v1.routes import auth, groceries, billing, ai, shopping_lists, pantry, kitchen_equipment, recipes, meal_plans, restaurants, nutrition, learning, seasonality, currencies
from app.api.v1.routes.exports import router as exports_router
from app.api.v1.routes.backups import router as backups_router
from app.api.v1.routes.admin import router as admin_router
from app.api.v1.routes.support import router as support_router
from app.api.v1.routes.dashboard import router as dashboard_router
from app.api.v1.routes.profiles import router as profiles_router

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

# Learning & Skills (Phase 9 module)
api_router.include_router(learning.router, tags=["Learning"])

# Seasonality (Phase 10 module)
api_router.include_router(seasonality.router, tags=["Seasonality"])

# Currencies (for user settings)
api_router.include_router(currencies.router, tags=["Currencies"])

# Exports
api_router.include_router(exports_router)

# Backups
api_router.include_router(backups_router)

# Admin Panel
api_router.include_router(admin_router)

# Support / Help Center
api_router.include_router(support_router)

# Dashboard (aggregated data)
api_router.include_router(dashboard_router)

# Profiles (household members)
api_router.include_router(profiles_router)
