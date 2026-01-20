"""
User preferences API endpoints.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import attributes
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter()


class UIVisibility(BaseModel):
    """UI visibility preferences."""
    showStatsCards: bool = True
    showSearchBar: bool = True
    showFilters: bool = True
    showDateRange: bool = True
    showViewSelector: bool = True
    showSorting: bool = True
    showPageTitle: bool = True
    showPageSubtitle: bool = True
    showInsights: bool = True
    # Common tabs
    showArchiveTab: bool = True
    showWasteTab: bool = True
    showAnalysisTab: bool = True
    showHistoryTab: bool = True
    # Module-specific tabs
    showMaintenanceTab: bool = True  # Kitchen Equipment
    showGoalsTab: bool = True  # Nutrition
    showSeasonalCalendarTab: bool = True  # Seasonality
    showLocalSpecialtiesTab: bool = True  # Seasonality
    showThisMonthTab: bool = True  # Seasonality
    showMySkillsTab: bool = True  # Learning
    showLibraryTab: bool = True  # Learning
    showLearningPathsTab: bool = True  # Learning
    showCollectionsTab: bool = True  # Recipes
    # Sidebar navigation - Planning
    showSidebarMealPlanner: bool = True
    showSidebarRecipes: bool = True
    showSidebarShoppingLists: bool = True
    # Sidebar navigation - Inventory
    showSidebarGroceries: bool = True
    showSidebarPantry: bool = True
    showSidebarKitchenEquipment: bool = True
    # Sidebar navigation - Tracking
    showSidebarRestaurants: bool = True
    showSidebarNutrition: bool = True
    # Sidebar navigation - Lifestyle
    showSidebarSeasonality: bool = True
    showSidebarLearning: bool = True
    # Sidebar navigation - Tools
    showSidebarExport: bool = True
    showSidebarBackups: bool = True
    showSidebarHelp: bool = True
    # Dashboard content
    showDashboardStats: bool = True
    showDashboardUpcomingMeals: bool = True
    showDashboardExpiringSoon: bool = True
    showDashboardRecentActivity: bool = True
    showDashboardQuickActions: bool = True
    showDashboardWasteAnalytics: bool = True
    showDashboardSkillsProgress: bool = True
    showDashboardSeasonalInsights: bool = True
    showDashboardNutrition: bool = True


class UIPreferencesResponse(BaseModel):
    """Response with UI preferences."""
    uiVisibility: UIVisibility

    class Config:
        from_attributes = True


class UIPreferencesUpdate(BaseModel):
    """Request body for updating UI preferences."""
    uiVisibility: Optional[UIVisibility] = None


# Default UI visibility preferences
DEFAULT_UI_VISIBILITY = {
    "showStatsCards": True,
    "showSearchBar": True,
    "showFilters": True,
    "showDateRange": True,
    "showViewSelector": True,
    "showSorting": True,
    "showPageTitle": True,
    "showPageSubtitle": True,
    "showInsights": True,
    # Common tabs
    "showArchiveTab": True,
    "showWasteTab": True,
    "showAnalysisTab": True,
    "showHistoryTab": True,
    # Module-specific tabs
    "showMaintenanceTab": True,
    "showGoalsTab": True,
    "showSeasonalCalendarTab": True,
    "showLocalSpecialtiesTab": True,
    "showThisMonthTab": True,
    "showMySkillsTab": True,
    "showLibraryTab": True,
    "showLearningPathsTab": True,
    "showCollectionsTab": True,
    # Sidebar navigation - Planning
    "showSidebarMealPlanner": True,
    "showSidebarRecipes": True,
    "showSidebarShoppingLists": True,
    # Sidebar navigation - Inventory
    "showSidebarGroceries": True,
    "showSidebarPantry": True,
    "showSidebarKitchenEquipment": True,
    # Sidebar navigation - Tracking
    "showSidebarRestaurants": True,
    "showSidebarNutrition": True,
    # Sidebar navigation - Lifestyle
    "showSidebarSeasonality": True,
    "showSidebarLearning": True,
    # Sidebar navigation - Tools
    "showSidebarExport": True,
    "showSidebarBackups": True,
    "showSidebarHelp": True,
    # Dashboard content
    "showDashboardStats": True,
    "showDashboardUpcomingMeals": True,
    "showDashboardExpiringSoon": True,
    "showDashboardRecentActivity": True,
    "showDashboardQuickActions": True,
    "showDashboardWasteAnalytics": True,
    "showDashboardSkillsProgress": True,
    "showDashboardSeasonalInsights": True,
    "showDashboardNutrition": True,
}


@router.get("/ui", response_model=UIPreferencesResponse)
async def get_ui_preferences(
    current_user: User = Depends(get_current_user),
):
    """
    Get current user's UI preferences.
    """
    ui_prefs = current_user.ui_preferences or {}
    ui_visibility = ui_prefs.get("uiVisibility", DEFAULT_UI_VISIBILITY)

    # Merge with defaults to ensure all fields are present
    merged_visibility = {**DEFAULT_UI_VISIBILITY, **ui_visibility}

    return UIPreferencesResponse(
        uiVisibility=UIVisibility(**merged_visibility)
    )


@router.put("/ui", response_model=UIPreferencesResponse)
async def update_ui_preferences(
    request: UIPreferencesUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update current user's UI preferences.
    """
    # Get existing preferences or create new dict copy to ensure change detection
    existing_prefs = current_user.ui_preferences or {}
    ui_prefs = dict(existing_prefs)  # Create a new dict to ensure SQLAlchemy detects change

    # Update visibility if provided
    if request.uiVisibility:
        ui_prefs["uiVisibility"] = request.uiVisibility.model_dump()

    # Save to database - assign new dict and flag as modified for SQLAlchemy
    current_user.ui_preferences = ui_prefs
    attributes.flag_modified(current_user, "ui_preferences")
    await db.commit()
    await db.refresh(current_user)

    # Return merged with defaults
    ui_visibility = ui_prefs.get("uiVisibility", DEFAULT_UI_VISIBILITY)
    merged_visibility = {**DEFAULT_UI_VISIBILITY, **ui_visibility}

    return UIPreferencesResponse(
        uiVisibility=UIVisibility(**merged_visibility)
    )
