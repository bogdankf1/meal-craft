"""Recipe API routes.

Thin route handlers: validate the request (via the FastAPI signature) and
delegate to ``service``. Ownership lookups and pagination live in the service
layer via ``get_owned_or_404`` / ``paginate``.
"""

from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.api.v1.routes.recipes import service
from app.api.v1.routes.recipes.schemas import (
    RecipeBatchCreate,
    RecipeUpdate,
    RecipeUpdateIngredients,
    RecipeResponse,
    RecipeListResponse,
    RecipeScaledResponse,
    CookingHistoryCreate,
    CookingHistoryResponse,
    CookingHistoryListResponse,
    RecipeCollectionCreate,
    RecipeCollectionUpdate,
    RecipeCollectionResponse,
    RecipeCollectionWithRecipes,
    AddToCollectionRequest,
    RemoveFromCollectionRequest,
    BulkActionRequest,
    BulkActionResponse,
    RecipeAnalytics,
    RecipeHistory,
    ParseRecipeTextRequest,
    ParseRecipeUrlRequest,
    ParseRecipeResponse,
    AddToShoppingListRequest,
    RecipeSuggestionRequest,
    RecipeSuggestionResponse,
    RecipeAvailabilityStatus,
)

router = APIRouter(prefix="/recipes")


# ============ Recipe CRUD ============

@router.get("", response_model=RecipeListResponse)
async def get_recipes(
    search: Optional[str] = None,
    category: Optional[str] = None,
    cuisine_type: Optional[str] = None,
    difficulty: Optional[str] = None,
    is_favorite: Optional[bool] = None,
    is_archived: Optional[bool] = False,
    tags: Optional[str] = None,  # Comma-separated
    max_prep_time: Optional[int] = None,
    max_cook_time: Optional[int] = None,
    max_total_time: Optional[int] = None,
    min_rating: Optional[int] = None,
    collection_id: Optional[UUID] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get paginated list of recipes with filters."""
    return await service.get_recipes(
        db,
        current_user,
        search=search,
        category=category,
        cuisine_type=cuisine_type,
        difficulty=difficulty,
        is_favorite=is_favorite,
        is_archived=is_archived,
        tags=tags,
        max_prep_time=max_prep_time,
        max_cook_time=max_cook_time,
        max_total_time=max_total_time,
        min_rating=min_rating,
        collection_id=collection_id,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/history", response_model=RecipeHistory)
async def get_recipe_history(
    months: int = Query(3, ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get recipe history (additions and cooking over time)."""
    return await service.get_recipe_history(db, current_user, months=months)


# ============ Recipe Availability ============

@router.get("/{recipe_id}/availability", response_model=RecipeAvailabilityStatus)
async def get_recipe_availability(
    recipe_id: UUID,
    servings: Optional[int] = Query(None, description="Check for this many servings (default: recipe servings)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check if pantry has enough ingredients to make this recipe.

    Returns availability status for each ingredient, including:
    - Whether the ingredient is available in pantry
    - How much is needed vs available
    - Maximum servings possible with current pantry
    """
    return await service.get_recipe_availability(db, current_user, recipe_id, servings=servings)


@router.get("/{recipe_id}", response_model=RecipeResponse)
async def get_recipe(
    recipe_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single recipe by ID."""
    return await service.get_recipe(db, current_user, recipe_id)


@router.post("", response_model=List[RecipeResponse])
async def create_recipes(
    data: RecipeBatchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create one or more recipes."""
    return await service.create_recipes(db, current_user, data)


@router.put("/{recipe_id}", response_model=RecipeResponse)
async def update_recipe(
    recipe_id: UUID,
    data: RecipeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a recipe."""
    return await service.update_recipe(db, current_user, recipe_id, data)


@router.put("/{recipe_id}/ingredients", response_model=RecipeResponse)
async def update_recipe_ingredients(
    recipe_id: UUID,
    data: RecipeUpdateIngredients,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update recipe ingredients (replaces all)."""
    return await service.update_recipe_ingredients(db, current_user, recipe_id, data)


@router.delete("/{recipe_id}")
async def delete_recipe(
    recipe_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a recipe."""
    return await service.delete_recipe(db, current_user, recipe_id)


@router.post("/{recipe_id}/calculate-nutrition", response_model=RecipeResponse)
async def calculate_recipe_nutrition(
    recipe_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate or recalculate nutrition for a recipe using AI."""
    return await service.calculate_recipe_nutrition(db, current_user, recipe_id)


@router.post("/bulk/calculate-nutrition")
async def bulk_calculate_nutrition(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate nutrition for all user's recipes that don't have nutrition data."""
    return await service.bulk_calculate_nutrition(db, current_user)


# ============ Scaling ============

@router.get("/{recipe_id}/scale", response_model=RecipeScaledResponse)
async def get_scaled_recipe(
    recipe_id: UUID,
    servings: int = Query(..., ge=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get recipe with scaled ingredients for different serving size."""
    return await service.get_scaled_recipe(db, current_user, recipe_id, servings)


# ============ Favorites ============

@router.post("/{recipe_id}/favorite", response_model=RecipeResponse)
async def toggle_favorite(
    recipe_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Toggle favorite status."""
    return await service.toggle_favorite(db, current_user, recipe_id)


# ============ Cooking History ============

@router.post("/{recipe_id}/cook", response_model=CookingHistoryResponse)
async def record_cooking(
    recipe_id: UUID,
    data: CookingHistoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record that a recipe was cooked."""
    return await service.record_cooking(db, current_user, recipe_id, data)


@router.get("/history/all", response_model=CookingHistoryListResponse)
async def get_cooking_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all cooking history for the user."""
    return await service.get_cooking_history(db, current_user, page=page, per_page=per_page)


# ============ Collections ============

@router.get("/collections/all", response_model=List[RecipeCollectionResponse])
async def get_collections(
    include_archived: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all recipe collections."""
    return await service.get_collections(db, current_user, include_archived=include_archived)


@router.post("/collections", response_model=RecipeCollectionResponse)
async def create_collection(
    data: RecipeCollectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new collection."""
    return await service.create_collection(db, current_user, data)


@router.get("/collections/{collection_id}", response_model=RecipeCollectionWithRecipes)
async def get_collection_with_recipes(
    collection_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a collection with its recipes."""
    return await service.get_collection_with_recipes(db, current_user, collection_id)


@router.put("/collections/{collection_id}", response_model=RecipeCollectionResponse)
async def update_collection(
    collection_id: UUID,
    data: RecipeCollectionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a collection."""
    return await service.update_collection(db, current_user, collection_id, data)


@router.delete("/collections/{collection_id}")
async def delete_collection(
    collection_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a collection (does not delete recipes)."""
    return await service.delete_collection(db, current_user, collection_id)


@router.post("/collections/{collection_id}/add", response_model=BulkActionResponse)
async def add_recipes_to_collection(
    collection_id: UUID,
    data: AddToCollectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add recipes to a collection."""
    return await service.add_recipes_to_collection(db, current_user, collection_id, data)


@router.post("/collections/{collection_id}/remove", response_model=BulkActionResponse)
async def remove_recipes_from_collection(
    collection_id: UUID,
    data: RemoveFromCollectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove recipes from a collection."""
    return await service.remove_recipes_from_collection(db, current_user, collection_id, data)


# ============ Bulk Actions ============

@router.post("/bulk-archive", response_model=BulkActionResponse)
async def bulk_archive_recipes(
    data: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Archive multiple recipes."""
    return await service.bulk_archive_recipes(db, current_user, data)


@router.post("/bulk-unarchive", response_model=BulkActionResponse)
async def bulk_unarchive_recipes(
    data: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unarchive multiple recipes."""
    return await service.bulk_unarchive_recipes(db, current_user, data)


@router.post("/bulk-delete", response_model=BulkActionResponse)
async def bulk_delete_recipes(
    data: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete multiple recipes."""
    return await service.bulk_delete_recipes(db, current_user, data)


@router.post("/bulk-favorite", response_model=BulkActionResponse)
async def bulk_favorite_recipes(
    data: BulkActionRequest,
    favorite: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Set favorite status for multiple recipes."""
    return await service.bulk_favorite_recipes(db, current_user, data, favorite=favorite)


# ============ Analytics ============

@router.get("/analytics/overview", response_model=RecipeAnalytics)
async def get_recipe_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get recipe analytics overview."""
    return await service.get_recipe_analytics(db, current_user)


# ============ AI Suggestions ============

@router.post("/suggest", response_model=RecipeSuggestionResponse)
async def suggest_recipes(
    data: RecipeSuggestionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate AI-powered recipe suggestions based on user preferences.

    Allows filtering by cuisine type, meal type, category, difficulty,
    dietary restrictions, and more.

    Automatically includes household dietary restrictions (allergies & dislikes)
    and nutritional preferences (diet type, goals).
    """
    return await service.suggest_recipes(db, current_user, data)


# ============ Import/Parse ============

@router.post("/parse-text", response_model=ParseRecipeResponse)
async def parse_recipe_text(
    data: ParseRecipeTextRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse free-form text into a recipe."""
    return await service.parse_recipe_text(db, current_user, data)


@router.post("/parse-voice", response_model=ParseRecipeResponse)
async def parse_recipe_voice(
    audio: UploadFile = File(...),
    language: str = Form("auto"),
    default_category: Optional[str] = Form(None),
    default_servings: int = Form(4),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Transcribe voice recording and parse as recipe."""
    return await service.parse_recipe_voice(
        db,
        current_user,
        audio,
        language=language,
        default_category=default_category,
        default_servings=default_servings,
    )


@router.post("/parse-image", response_model=ParseRecipeResponse)
async def parse_recipe_image(
    images: List[UploadFile] = File(...),
    import_type: str = Form("recipe"),  # recipe, screenshot
    default_category: Optional[str] = Form(None),
    default_servings: int = Form(4),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse recipe from image(s) - handwritten, cookbook, screenshot."""
    return await service.parse_recipe_image(
        db,
        current_user,
        images,
        import_type=import_type,
        default_category=default_category,
        default_servings=default_servings,
    )


@router.post("/parse-url", response_model=ParseRecipeResponse)
async def parse_recipe_url(
    data: ParseRecipeUrlRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse recipe from a URL (website)."""
    return await service.parse_recipe_url(db, current_user, data)


# ============ Shopping List Integration ============

@router.post("/{recipe_id}/add-to-shopping-list")
async def add_recipe_to_shopping_list(
    recipe_id: UUID,
    data: AddToShoppingListRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add recipe ingredients to a shopping list."""
    return await service.add_recipe_to_shopping_list(db, current_user, recipe_id, data)
