"""
Admin API routes module.
"""
from fastapi import APIRouter

from app.api.v1.routes.admin.users import router as users_router
from app.api.v1.routes.admin.tiers import router as tiers_router
from app.api.v1.routes.admin.analytics import router as analytics_router
from app.api.v1.routes.admin.currencies import router as currencies_router

router = APIRouter(prefix="/admin", tags=["Admin"])

router.include_router(users_router)
router.include_router(tiers_router)
router.include_router(analytics_router)
router.include_router(currencies_router)
