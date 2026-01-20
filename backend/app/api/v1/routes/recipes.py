"""Recipe API Routes"""

import math
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy import select, func, desc, asc, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.recipe import (
    Recipe,
    RecipeIngredient,
    RecipeNutrition,
    CookingHistory,
    RecipeCollection,
    recipe_collection_association,
)
from app.services.ai_service import AIService
from app.schemas.recipe import (
    RecipeCreate,
    RecipeBatchCreate,
    RecipeUpdate,
    RecipeUpdateIngredients,
    RecipeResponse,
    RecipeListItem,
    RecipeListResponse,
    RecipeScaledResponse,
    RecipeIngredientScaled,
    RecipeFilters,
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
    RecipesByCategory,
    RecipesByCuisine,
    RecipesByDifficulty,
    MostCookedRecipe,
    RecipeHistory,
    MonthlyRecipeData,
    ParseRecipeTextRequest,
    ParseRecipeUrlRequest,
    ParseRecipeResponse,
    AddToShoppingListRequest,
    RecipeSuggestionRequest,
    RecipeSuggestionItem,
    RecipeSuggestionResponse,
)
from app.services.ai_service import ai_service

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
    # Base query
    query = select(Recipe).where(Recipe.user_id == current_user.id)

    # Apply filters
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Recipe.name.ilike(search_term),
                Recipe.description.ilike(search_term),
                Recipe.cuisine_type.ilike(search_term),
            )
        )

    if category:
        query = query.where(Recipe.category == category)

    if cuisine_type:
        query = query.where(Recipe.cuisine_type.ilike(f"%{cuisine_type}%"))

    if difficulty:
        query = query.where(Recipe.difficulty == difficulty)

    if is_favorite is not None:
        query = query.where(Recipe.is_favorite == is_favorite)

    if is_archived is not None:
        query = query.where(Recipe.is_archived == is_archived)

    if tags:
        tag_list = [t.strip() for t in tags.split(",")]
        query = query.where(Recipe.tags.overlap(tag_list))

    if max_prep_time:
        query = query.where(Recipe.prep_time <= max_prep_time)

    if max_cook_time:
        query = query.where(Recipe.cook_time <= max_cook_time)

    if max_total_time:
        query = query.where(
            (Recipe.prep_time + Recipe.cook_time) <= max_total_time
        )

    if min_rating:
        query = query.where(Recipe.rating >= min_rating)

    if collection_id:
        query = query.join(recipe_collection_association).where(
            recipe_collection_association.c.collection_id == collection_id
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply sorting
    sort_column = getattr(Recipe, sort_by, Recipe.created_at)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    # Apply pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    # Load relationships for ingredient count
    query = query.options(selectinload(Recipe.ingredients))

    result = await db.execute(query)
    recipes = result.scalars().all()

    # Convert to list items
    items = []
    for recipe in recipes:
        items.append(RecipeListItem(
            id=recipe.id,
            name=recipe.name,
            description=recipe.description,
            category=recipe.category,
            cuisine_type=recipe.cuisine_type,
            prep_time=recipe.prep_time,
            cook_time=recipe.cook_time,
            total_time=recipe.total_time,
            servings=recipe.servings,
            difficulty=recipe.difficulty,
            image_url=recipe.image_url,
            is_favorite=recipe.is_favorite,
            rating=recipe.rating,
            times_cooked=recipe.times_cooked,
            is_archived=recipe.is_archived,
            created_at=recipe.created_at,
            ingredient_count=len(recipe.ingredients),
            tags=recipe.tags,
            required_equipment=recipe.required_equipment,
        ))

    return RecipeListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=math.ceil(total / per_page) if total > 0 else 0,
    )


@router.get("/history", response_model=RecipeHistory)
async def get_recipe_history(
    months: int = Query(3, ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get recipe history (additions and cooking over time)."""
    from dateutil.relativedelta import relativedelta

    end_date = datetime.utcnow()

    monthly_data = []

    for i in range(months):
        month_start = end_date - relativedelta(months=i+1)
        month_end = end_date - relativedelta(months=i)

        # Recipes added
        added_query = select(func.count()).select_from(Recipe).where(
            Recipe.user_id == current_user.id,
            Recipe.created_at >= month_start,
            Recipe.created_at < month_end,
        )
        added = (await db.execute(added_query)).scalar() or 0

        # Times cooked
        cooked_query = select(func.count()).select_from(CookingHistory).where(
            CookingHistory.user_id == current_user.id,
            CookingHistory.cooked_at >= month_start,
            CookingHistory.cooked_at < month_end,
        )
        cooked = (await db.execute(cooked_query)).scalar() or 0

        monthly_data.append(MonthlyRecipeData(
            month=month_start.strftime("%Y-%m"),
            month_label=month_start.strftime("%b %Y"),
            recipes_added=added,
            times_cooked=cooked,
        ))

    monthly_data.reverse()

    # Totals
    total_added = sum(m.recipes_added for m in monthly_data)
    total_cooked = sum(m.times_cooked for m in monthly_data)

    return RecipeHistory(
        period_months=months,
        total_recipes_added=total_added,
        total_times_cooked=total_cooked,
        monthly_data=monthly_data,
    )


@router.get("/{recipe_id}", response_model=RecipeResponse)
async def get_recipe(
    recipe_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single recipe by ID."""
    query = (
        select(Recipe)
        .where(Recipe.id == recipe_id, Recipe.user_id == current_user.id)
        .options(
            selectinload(Recipe.ingredients),
            selectinload(Recipe.nutrition),
            selectinload(Recipe.collections),
            selectinload(Recipe.cooking_history),
        )
    )
    result = await db.execute(query)
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    return RecipeResponse(
        id=recipe.id,
        user_id=recipe.user_id,
        name=recipe.name,
        description=recipe.description,
        category=recipe.category,
        cuisine_type=recipe.cuisine_type,
        dietary_restrictions=recipe.dietary_restrictions,
        tags=recipe.tags,
        prep_time=recipe.prep_time,
        cook_time=recipe.cook_time,
        servings=recipe.servings,
        difficulty=recipe.difficulty,
        instructions=recipe.instructions,
        instructions_json=recipe.instructions_json,
        source=recipe.source,
        source_url=recipe.source_url,
        image_url=recipe.image_url,
        notes=recipe.notes,
        is_public=recipe.is_public,
        is_ai_generated=recipe.is_ai_generated,
        is_favorite=recipe.is_favorite,
        rating=recipe.rating,
        times_cooked=recipe.times_cooked,
        is_archived=recipe.is_archived,
        created_at=recipe.created_at,
        updated_at=recipe.updated_at,
        total_time=recipe.total_time,
        last_cooked=recipe.last_cooked,
        ingredients=recipe.ingredients,
        nutrition=recipe.nutrition,
        collection_ids=[c.id for c in recipe.collections],
        # Integration fields
        required_equipment=recipe.required_equipment,
        techniques=recipe.techniques,
        seasonal_info=recipe.seasonal_info,
        best_season_months=recipe.best_season_months,
    )


@router.post("", response_model=List[RecipeResponse])
async def create_recipes(
    data: RecipeBatchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create one or more recipes."""
    created_recipes = []
    ai_service = AIService()

    for recipe_data in data.items:
        # Create recipe
        recipe = Recipe(
            user_id=current_user.id,
            name=recipe_data.name,
            description=recipe_data.description,
            category=recipe_data.category.value if recipe_data.category else None,
            cuisine_type=recipe_data.cuisine_type,
            dietary_restrictions=recipe_data.dietary_restrictions,
            tags=recipe_data.tags,
            prep_time=recipe_data.prep_time,
            cook_time=recipe_data.cook_time,
            servings=recipe_data.servings,
            difficulty=recipe_data.difficulty.value if recipe_data.difficulty else None,
            instructions=recipe_data.instructions,
            instructions_json=[s.model_dump() for s in recipe_data.instructions_json] if recipe_data.instructions_json else None,
            source=recipe_data.source,
            source_url=recipe_data.source_url,
            notes=recipe_data.notes,
            is_favorite=recipe_data.is_favorite,
            is_ai_generated=False,
            # Integration fields
            required_equipment=[eq.model_dump() for eq in recipe_data.required_equipment] if recipe_data.required_equipment else None,
            techniques=[tech.model_dump() for tech in recipe_data.techniques] if recipe_data.techniques else None,
            seasonal_info=[si.model_dump() for si in recipe_data.seasonal_info] if recipe_data.seasonal_info else None,
            best_season_months=recipe_data.best_season_months,
        )
        db.add(recipe)
        await db.flush()

        # Add ingredients
        ingredients_for_ai = []
        for ing_data in recipe_data.ingredients:
            ingredient = RecipeIngredient(
                recipe_id=recipe.id,
                ingredient_name=ing_data.ingredient_name,
                quantity=ing_data.quantity,
                unit=ing_data.unit,
                category=ing_data.category,
            )
            db.add(ingredient)
            # Collect ingredients for AI nutrition calculation
            ingredients_for_ai.append({
                "ingredient_name": ing_data.ingredient_name,
                "quantity": float(ing_data.quantity) if ing_data.quantity else None,
                "unit": ing_data.unit,
            })

        # Add nutrition if provided, otherwise calculate using AI
        if recipe_data.nutrition:
            nutrition = RecipeNutrition(
                recipe_id=recipe.id,
                calories=recipe_data.nutrition.calories,
                protein_g=recipe_data.nutrition.protein_g,
                carbs_g=recipe_data.nutrition.carbs_g,
                fat_g=recipe_data.nutrition.fat_g,
                fiber_g=recipe_data.nutrition.fiber_g,
                sugar_g=recipe_data.nutrition.sugar_g,
                sodium_mg=recipe_data.nutrition.sodium_mg,
            )
            db.add(nutrition)
        elif ingredients_for_ai:
            # Calculate nutrition using AI
            try:
                ai_nutrition = await ai_service.calculate_recipe_nutrition(
                    recipe_name=recipe_data.name,
                    ingredients=ingredients_for_ai,
                    servings=recipe_data.servings or 1,
                )
                if ai_nutrition:
                    nutrition = RecipeNutrition(
                        recipe_id=recipe.id,
                        calories=ai_nutrition.get("calories"),
                        protein_g=ai_nutrition.get("protein_g"),
                        carbs_g=ai_nutrition.get("carbs_g"),
                        fat_g=ai_nutrition.get("fat_g"),
                        fiber_g=ai_nutrition.get("fiber_g"),
                        sugar_g=ai_nutrition.get("sugar_g"),
                        sodium_mg=ai_nutrition.get("sodium_mg"),
                    )
                    db.add(nutrition)
            except Exception as e:
                # Log error but don't fail recipe creation
                print(f"[Recipes] Failed to calculate AI nutrition for '{recipe_data.name}': {e}")

        created_recipes.append(recipe)

    await db.commit()

    # Reload with relationships
    result_recipes = []
    for recipe in created_recipes:
        await db.refresh(recipe)
        query = (
            select(Recipe)
            .where(Recipe.id == recipe.id)
            .options(
                selectinload(Recipe.ingredients),
                selectinload(Recipe.nutrition),
                selectinload(Recipe.collections),
                selectinload(Recipe.cooking_history),
            )
        )
        result = await db.execute(query)
        loaded_recipe = result.scalar_one()
        result_recipes.append(loaded_recipe)

    return result_recipes


@router.put("/{recipe_id}", response_model=RecipeResponse)
async def update_recipe(
    recipe_id: UUID,
    data: RecipeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a recipe."""
    query = select(Recipe).where(
        Recipe.id == recipe_id,
        Recipe.user_id == current_user.id
    )
    result = await db.execute(query)
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "category" and value:
            value = value.value if hasattr(value, "value") else value
        if field == "difficulty" and value:
            value = value.value if hasattr(value, "value") else value
        setattr(recipe, field, value)

    await db.commit()
    await db.refresh(recipe)

    # Reload with relationships
    query = (
        select(Recipe)
        .where(Recipe.id == recipe.id)
        .options(
            selectinload(Recipe.ingredients),
            selectinload(Recipe.nutrition),
            selectinload(Recipe.collections),
            selectinload(Recipe.cooking_history),
        )
    )
    result = await db.execute(query)
    recipe = result.scalar_one()

    return recipe


@router.put("/{recipe_id}/ingredients", response_model=RecipeResponse)
async def update_recipe_ingredients(
    recipe_id: UUID,
    data: RecipeUpdateIngredients,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update recipe ingredients (replaces all)."""
    query = select(Recipe).where(
        Recipe.id == recipe_id,
        Recipe.user_id == current_user.id
    )
    result = await db.execute(query)
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Delete existing ingredients
    await db.execute(
        select(RecipeIngredient).where(RecipeIngredient.recipe_id == recipe_id)
    )
    for ing in recipe.ingredients:
        await db.delete(ing)

    # Add new ingredients
    for ing_data in data.ingredients:
        ingredient = RecipeIngredient(
            recipe_id=recipe.id,
            ingredient_name=ing_data.ingredient_name,
            quantity=ing_data.quantity,
            unit=ing_data.unit,
            category=ing_data.category,
        )
        db.add(ingredient)

    await db.commit()

    # Reload
    query = (
        select(Recipe)
        .where(Recipe.id == recipe.id)
        .options(
            selectinload(Recipe.ingredients),
            selectinload(Recipe.nutrition),
            selectinload(Recipe.collections),
        )
    )
    result = await db.execute(query)
    recipe = result.scalar_one()

    return recipe


@router.delete("/{recipe_id}")
async def delete_recipe(
    recipe_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a recipe."""
    query = select(Recipe).where(
        Recipe.id == recipe_id,
        Recipe.user_id == current_user.id
    )
    result = await db.execute(query)
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    await db.delete(recipe)
    await db.commit()

    return {"success": True, "message": "Recipe deleted"}


@router.post("/{recipe_id}/calculate-nutrition", response_model=RecipeResponse)
async def calculate_recipe_nutrition(
    recipe_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate or recalculate nutrition for a recipe using AI."""
    query = (
        select(Recipe)
        .where(Recipe.id == recipe_id, Recipe.user_id == current_user.id)
        .options(
            selectinload(Recipe.ingredients),
            selectinload(Recipe.nutrition),
            selectinload(Recipe.collections),
            selectinload(Recipe.cooking_history),
        )
    )
    result = await db.execute(query)
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    if not recipe.ingredients:
        raise HTTPException(status_code=400, detail="Recipe has no ingredients to calculate nutrition from")

    # Prepare ingredients for AI
    ingredients_for_ai = [
        {
            "ingredient_name": ing.ingredient_name,
            "quantity": float(ing.quantity) if ing.quantity else None,
            "unit": ing.unit,
        }
        for ing in recipe.ingredients
    ]

    # Calculate nutrition using AI
    ai_service = AIService()
    try:
        ai_nutrition = await ai_service.calculate_recipe_nutrition(
            recipe_name=recipe.name,
            ingredients=ingredients_for_ai,
            servings=recipe.servings or 1,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate nutrition: {str(e)}")

    if not ai_nutrition:
        raise HTTPException(status_code=500, detail="AI returned empty nutrition data")

    # Update or create nutrition record
    if recipe.nutrition:
        recipe.nutrition.calories = ai_nutrition.get("calories")
        recipe.nutrition.protein_g = ai_nutrition.get("protein_g")
        recipe.nutrition.carbs_g = ai_nutrition.get("carbs_g")
        recipe.nutrition.fat_g = ai_nutrition.get("fat_g")
        recipe.nutrition.fiber_g = ai_nutrition.get("fiber_g")
        recipe.nutrition.sugar_g = ai_nutrition.get("sugar_g")
        recipe.nutrition.sodium_mg = ai_nutrition.get("sodium_mg")
    else:
        nutrition = RecipeNutrition(
            recipe_id=recipe.id,
            calories=ai_nutrition.get("calories"),
            protein_g=ai_nutrition.get("protein_g"),
            carbs_g=ai_nutrition.get("carbs_g"),
            fat_g=ai_nutrition.get("fat_g"),
            fiber_g=ai_nutrition.get("fiber_g"),
            sugar_g=ai_nutrition.get("sugar_g"),
            sodium_mg=ai_nutrition.get("sodium_mg"),
        )
        db.add(nutrition)

    await db.commit()

    # Reload with relationships
    query = (
        select(Recipe)
        .where(Recipe.id == recipe.id)
        .options(
            selectinload(Recipe.ingredients),
            selectinload(Recipe.nutrition),
            selectinload(Recipe.collections),
            selectinload(Recipe.cooking_history),
        )
    )
    result = await db.execute(query)
    recipe = result.scalar_one()

    return recipe


@router.post("/bulk/calculate-nutrition")
async def bulk_calculate_nutrition(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate nutrition for all user's recipes that don't have nutrition data."""
    # Get all recipes without nutrition
    query = (
        select(Recipe)
        .where(Recipe.user_id == current_user.id)
        .options(
            selectinload(Recipe.ingredients),
            selectinload(Recipe.nutrition),
        )
    )
    result = await db.execute(query)
    recipes = result.scalars().all()

    ai_service = AIService()
    processed = 0
    failed = 0
    skipped = 0

    for recipe in recipes:
        # Skip if already has nutrition
        if recipe.nutrition:
            skipped += 1
            continue

        # Skip if no ingredients
        if not recipe.ingredients:
            skipped += 1
            continue

        # Prepare ingredients for AI
        ingredients_for_ai = [
            {
                "ingredient_name": ing.ingredient_name,
                "quantity": float(ing.quantity) if ing.quantity else None,
                "unit": ing.unit,
            }
            for ing in recipe.ingredients
        ]

        try:
            ai_nutrition = await ai_service.calculate_recipe_nutrition(
                recipe_name=recipe.name,
                ingredients=ingredients_for_ai,
                servings=recipe.servings or 1,
            )
            if ai_nutrition:
                nutrition = RecipeNutrition(
                    recipe_id=recipe.id,
                    calories=ai_nutrition.get("calories"),
                    protein_g=ai_nutrition.get("protein_g"),
                    carbs_g=ai_nutrition.get("carbs_g"),
                    fat_g=ai_nutrition.get("fat_g"),
                    fiber_g=ai_nutrition.get("fiber_g"),
                    sugar_g=ai_nutrition.get("sugar_g"),
                    sodium_mg=ai_nutrition.get("sodium_mg"),
                )
                db.add(nutrition)
                processed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"[Recipes] Failed to calculate nutrition for '{recipe.name}': {e}")
            failed += 1

    await db.commit()

    return {
        "success": True,
        "processed": processed,
        "failed": failed,
        "skipped": skipped,
        "total": len(recipes),
    }


# ============ Scaling ============

@router.get("/{recipe_id}/scale", response_model=RecipeScaledResponse)
async def get_scaled_recipe(
    recipe_id: UUID,
    servings: int = Query(..., ge=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get recipe with scaled ingredients for different serving size."""
    query = (
        select(Recipe)
        .where(Recipe.id == recipe_id, Recipe.user_id == current_user.id)
        .options(
            selectinload(Recipe.ingredients),
            selectinload(Recipe.nutrition),
            selectinload(Recipe.collections),
        )
    )
    result = await db.execute(query)
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    scale_factor = servings / recipe.servings

    scaled_ingredients = []
    for ing in recipe.ingredients:
        scaled_qty = float(ing.quantity) * scale_factor if ing.quantity else None
        scaled_ingredients.append(RecipeIngredientScaled(
            ingredient_name=ing.ingredient_name,
            quantity=round(scaled_qty, 2) if scaled_qty else None,
            unit=ing.unit,
            original_quantity=ing.quantity,
            scale_factor=scale_factor,
        ))

    return RecipeScaledResponse(
        recipe=recipe,
        scale_factor=scale_factor,
        scaled_servings=servings,
        scaled_ingredients=scaled_ingredients,
    )


# ============ Favorites ============

@router.post("/{recipe_id}/favorite", response_model=RecipeResponse)
async def toggle_favorite(
    recipe_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Toggle favorite status."""
    query = select(Recipe).where(
        Recipe.id == recipe_id,
        Recipe.user_id == current_user.id
    )
    result = await db.execute(query)
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    recipe.is_favorite = not recipe.is_favorite
    await db.commit()
    await db.refresh(recipe)

    return recipe


# ============ Cooking History ============

@router.post("/{recipe_id}/cook", response_model=CookingHistoryResponse)
async def record_cooking(
    recipe_id: UUID,
    data: CookingHistoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record that a recipe was cooked."""
    # Verify recipe exists
    query = select(Recipe).where(
        Recipe.id == recipe_id,
        Recipe.user_id == current_user.id
    )
    result = await db.execute(query)
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Create history entry
    # Ensure cooked_at is timezone-naive for PostgreSQL
    cooked_at = data.cooked_at or datetime.utcnow()
    if cooked_at.tzinfo is not None:
        cooked_at = cooked_at.replace(tzinfo=None)

    history = CookingHistory(
        user_id=current_user.id,
        recipe_id=recipe_id,
        cooked_at=cooked_at,
        servings_made=data.servings_made,
        notes=data.notes,
        rating=data.rating,
    )
    db.add(history)

    # Update recipe times_cooked
    recipe.times_cooked = (recipe.times_cooked or 0) + 1

    # Update recipe rating if provided
    if data.rating:
        # Average with existing rating
        if recipe.rating:
            recipe.rating = (recipe.rating + data.rating) // 2
        else:
            recipe.rating = data.rating

    await db.commit()
    await db.refresh(history)

    return CookingHistoryResponse(
        id=history.id,
        user_id=history.user_id,
        recipe_id=history.recipe_id,
        cooked_at=history.cooked_at,
        servings_made=history.servings_made,
        notes=history.notes,
        rating=history.rating,
        created_at=history.created_at,
        recipe_name=recipe.name,
    )


@router.get("/history/all", response_model=CookingHistoryListResponse)
async def get_cooking_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all cooking history for the user."""
    # Count
    count_query = select(func.count()).select_from(CookingHistory).where(
        CookingHistory.user_id == current_user.id
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get items
    offset = (page - 1) * per_page
    query = (
        select(CookingHistory)
        .where(CookingHistory.user_id == current_user.id)
        .order_by(desc(CookingHistory.cooked_at))
        .offset(offset)
        .limit(per_page)
    )
    result = await db.execute(query)
    history_items = result.scalars().all()

    # Get recipe names
    recipe_ids = [h.recipe_id for h in history_items]
    recipe_query = select(Recipe.id, Recipe.name).where(Recipe.id.in_(recipe_ids))
    recipe_result = await db.execute(recipe_query)
    recipe_names = {r.id: r.name for r in recipe_result.all()}

    items = [
        CookingHistoryResponse(
            id=h.id,
            user_id=h.user_id,
            recipe_id=h.recipe_id,
            cooked_at=h.cooked_at,
            servings_made=h.servings_made,
            notes=h.notes,
            rating=h.rating,
            created_at=h.created_at,
            recipe_name=recipe_names.get(h.recipe_id),
        )
        for h in history_items
    ]

    return CookingHistoryListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=math.ceil(total / per_page) if total > 0 else 0,
    )


# ============ Collections ============

@router.get("/collections/all", response_model=List[RecipeCollectionResponse])
async def get_collections(
    include_archived: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all recipe collections."""
    query = select(RecipeCollection).where(
        RecipeCollection.user_id == current_user.id
    )

    if not include_archived:
        query = query.where(RecipeCollection.is_archived == False)

    query = query.order_by(RecipeCollection.name)
    query = query.options(selectinload(RecipeCollection.recipes))

    result = await db.execute(query)
    collections = result.scalars().all()

    return [
        RecipeCollectionResponse(
            id=c.id,
            user_id=c.user_id,
            name=c.name,
            description=c.description,
            color=c.color,
            icon=c.icon,
            is_archived=c.is_archived,
            created_at=c.created_at,
            updated_at=c.updated_at,
            recipe_count=len(c.recipes),
        )
        for c in collections
    ]


@router.post("/collections", response_model=RecipeCollectionResponse)
async def create_collection(
    data: RecipeCollectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new collection."""
    collection = RecipeCollection(
        user_id=current_user.id,
        name=data.name,
        description=data.description,
        color=data.color,
        icon=data.icon,
    )
    db.add(collection)
    await db.commit()
    await db.refresh(collection)

    return RecipeCollectionResponse(
        id=collection.id,
        user_id=collection.user_id,
        name=collection.name,
        description=collection.description,
        color=collection.color,
        icon=collection.icon,
        is_archived=collection.is_archived,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
        recipe_count=0,
    )


@router.get("/collections/{collection_id}", response_model=RecipeCollectionWithRecipes)
async def get_collection_with_recipes(
    collection_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a collection with its recipes."""
    query = (
        select(RecipeCollection)
        .where(
            RecipeCollection.id == collection_id,
            RecipeCollection.user_id == current_user.id
        )
        .options(selectinload(RecipeCollection.recipes).selectinload(Recipe.ingredients))
    )
    result = await db.execute(query)
    collection = result.scalar_one_or_none()

    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    recipes = [
        RecipeListItem(
            id=r.id,
            name=r.name,
            description=r.description,
            category=r.category,
            cuisine_type=r.cuisine_type,
            prep_time=r.prep_time,
            cook_time=r.cook_time,
            total_time=r.total_time,
            servings=r.servings,
            difficulty=r.difficulty,
            image_url=r.image_url,
            is_favorite=r.is_favorite,
            rating=r.rating,
            times_cooked=r.times_cooked,
            is_archived=r.is_archived,
            created_at=r.created_at,
            ingredient_count=len(r.ingredients),
            tags=r.tags,
            required_equipment=r.required_equipment,
        )
        for r in collection.recipes
        if not r.is_archived
    ]

    return RecipeCollectionWithRecipes(
        collection=RecipeCollectionResponse(
            id=collection.id,
            user_id=collection.user_id,
            name=collection.name,
            description=collection.description,
            color=collection.color,
            icon=collection.icon,
            is_archived=collection.is_archived,
            created_at=collection.created_at,
            updated_at=collection.updated_at,
            recipe_count=len(recipes),
        ),
        recipes=recipes,
    )


@router.put("/collections/{collection_id}", response_model=RecipeCollectionResponse)
async def update_collection(
    collection_id: UUID,
    data: RecipeCollectionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a collection."""
    query = select(RecipeCollection).where(
        RecipeCollection.id == collection_id,
        RecipeCollection.user_id == current_user.id
    )
    result = await db.execute(query)
    collection = result.scalar_one_or_none()

    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(collection, field, value)

    await db.commit()
    await db.refresh(collection)

    return collection


@router.delete("/collections/{collection_id}")
async def delete_collection(
    collection_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a collection (does not delete recipes)."""
    query = select(RecipeCollection).where(
        RecipeCollection.id == collection_id,
        RecipeCollection.user_id == current_user.id
    )
    result = await db.execute(query)
    collection = result.scalar_one_or_none()

    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    await db.delete(collection)
    await db.commit()

    return {"success": True, "message": "Collection deleted"}


@router.post("/collections/{collection_id}/add", response_model=BulkActionResponse)
async def add_recipes_to_collection(
    collection_id: UUID,
    data: AddToCollectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add recipes to a collection."""
    # Verify collection
    collection_query = select(RecipeCollection).where(
        RecipeCollection.id == collection_id,
        RecipeCollection.user_id == current_user.id
    ).options(selectinload(RecipeCollection.recipes))
    result = await db.execute(collection_query)
    collection = result.scalar_one_or_none()

    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    # Get recipes
    recipes_query = select(Recipe).where(
        Recipe.id.in_(data.recipe_ids),
        Recipe.user_id == current_user.id
    )
    result = await db.execute(recipes_query)
    recipes = result.scalars().all()

    # Add to collection
    existing_ids = {r.id for r in collection.recipes}
    added_count = 0

    for recipe in recipes:
        if recipe.id not in existing_ids:
            collection.recipes.append(recipe)
            added_count += 1

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=added_count,
        message=f"Added {added_count} recipes to collection",
    )


@router.post("/collections/{collection_id}/remove", response_model=BulkActionResponse)
async def remove_recipes_from_collection(
    collection_id: UUID,
    data: RemoveFromCollectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove recipes from a collection."""
    # Verify collection
    collection_query = select(RecipeCollection).where(
        RecipeCollection.id == collection_id,
        RecipeCollection.user_id == current_user.id
    ).options(selectinload(RecipeCollection.recipes))
    result = await db.execute(collection_query)
    collection = result.scalar_one_or_none()

    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    # Remove recipes
    removed_count = 0
    collection.recipes = [
        r for r in collection.recipes
        if r.id not in data.recipe_ids or (removed_count := removed_count + 1) and False
    ]

    # Actually count removed
    original_count = len(collection.recipes) + len(data.recipe_ids)
    new_recipes = [r for r in collection.recipes if r.id not in data.recipe_ids]
    removed_count = len(collection.recipes) - len(new_recipes)
    collection.recipes = new_recipes

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=removed_count,
        message=f"Removed {removed_count} recipes from collection",
    )


# ============ Bulk Actions ============

@router.post("/bulk-archive", response_model=BulkActionResponse)
async def bulk_archive_recipes(
    data: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Archive multiple recipes."""
    query = select(Recipe).where(
        Recipe.id.in_(data.ids),
        Recipe.user_id == current_user.id
    )
    result = await db.execute(query)
    recipes = result.scalars().all()

    for recipe in recipes:
        recipe.is_archived = True

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=len(recipes),
        message=f"Archived {len(recipes)} recipes",
    )


@router.post("/bulk-unarchive", response_model=BulkActionResponse)
async def bulk_unarchive_recipes(
    data: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unarchive multiple recipes."""
    query = select(Recipe).where(
        Recipe.id.in_(data.ids),
        Recipe.user_id == current_user.id
    )
    result = await db.execute(query)
    recipes = result.scalars().all()

    for recipe in recipes:
        recipe.is_archived = False

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=len(recipes),
        message=f"Unarchived {len(recipes)} recipes",
    )


@router.post("/bulk-delete", response_model=BulkActionResponse)
async def bulk_delete_recipes(
    data: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete multiple recipes."""
    query = select(Recipe).where(
        Recipe.id.in_(data.ids),
        Recipe.user_id == current_user.id
    )
    result = await db.execute(query)
    recipes = result.scalars().all()

    count = len(recipes)
    for recipe in recipes:
        await db.delete(recipe)

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=count,
        message=f"Deleted {count} recipes",
    )


@router.post("/bulk-favorite", response_model=BulkActionResponse)
async def bulk_favorite_recipes(
    data: BulkActionRequest,
    favorite: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Set favorite status for multiple recipes."""
    query = select(Recipe).where(
        Recipe.id.in_(data.ids),
        Recipe.user_id == current_user.id
    )
    result = await db.execute(query)
    recipes = result.scalars().all()

    for recipe in recipes:
        recipe.is_favorite = favorite

    await db.commit()

    action = "favorited" if favorite else "unfavorited"
    return BulkActionResponse(
        success=True,
        affected_count=len(recipes),
        message=f"{action.capitalize()} {len(recipes)} recipes",
    )


# ============ Analytics ============

@router.get("/analytics/overview", response_model=RecipeAnalytics)
async def get_recipe_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get recipe analytics overview."""
    # Total counts
    total_query = select(func.count()).select_from(Recipe).where(
        Recipe.user_id == current_user.id,
        Recipe.is_archived == False
    )
    total = (await db.execute(total_query)).scalar() or 0

    favorites_query = select(func.count()).select_from(Recipe).where(
        Recipe.user_id == current_user.id,
        Recipe.is_favorite == True,
        Recipe.is_archived == False
    )
    favorites = (await db.execute(favorites_query)).scalar() or 0

    archived_query = select(func.count()).select_from(Recipe).where(
        Recipe.user_id == current_user.id,
        Recipe.is_archived == True
    )
    archived = (await db.execute(archived_query)).scalar() or 0

    # By category
    category_query = (
        select(Recipe.category, func.count().label("count"))
        .where(Recipe.user_id == current_user.id, Recipe.is_archived == False)
        .group_by(Recipe.category)
    )
    category_result = await db.execute(category_query)
    by_category = [
        RecipesByCategory(category=r.category or "other", count=r.count)
        for r in category_result.all()
    ]

    # By cuisine
    cuisine_query = (
        select(Recipe.cuisine_type, func.count().label("count"))
        .where(
            Recipe.user_id == current_user.id,
            Recipe.is_archived == False,
            Recipe.cuisine_type.isnot(None)
        )
        .group_by(Recipe.cuisine_type)
    )
    cuisine_result = await db.execute(cuisine_query)
    by_cuisine = [
        RecipesByCuisine(cuisine=r.cuisine_type, count=r.count)
        for r in cuisine_result.all()
    ]

    # By difficulty
    difficulty_query = (
        select(Recipe.difficulty, func.count().label("count"))
        .where(
            Recipe.user_id == current_user.id,
            Recipe.is_archived == False,
            Recipe.difficulty.isnot(None)
        )
        .group_by(Recipe.difficulty)
    )
    difficulty_result = await db.execute(difficulty_query)
    by_difficulty = [
        RecipesByDifficulty(difficulty=r.difficulty, count=r.count)
        for r in difficulty_result.all()
    ]

    # Most cooked
    most_cooked_query = (
        select(Recipe)
        .where(
            Recipe.user_id == current_user.id,
            Recipe.is_archived == False,
            Recipe.times_cooked > 0
        )
        .order_by(desc(Recipe.times_cooked))
        .limit(5)
    )
    most_cooked_result = await db.execute(most_cooked_query)
    most_cooked = [
        MostCookedRecipe(
            id=r.id,
            name=r.name,
            times_cooked=r.times_cooked,
            category=r.category
        )
        for r in most_cooked_result.scalars().all()
    ]

    # Recently added
    recent_query = (
        select(Recipe)
        .where(Recipe.user_id == current_user.id, Recipe.is_archived == False)
        .order_by(desc(Recipe.created_at))
        .limit(5)
        .options(selectinload(Recipe.ingredients))
    )
    recent_result = await db.execute(recent_query)
    recently_added = [
        RecipeListItem(
            id=r.id,
            name=r.name,
            description=r.description,
            category=r.category,
            cuisine_type=r.cuisine_type,
            prep_time=r.prep_time,
            cook_time=r.cook_time,
            total_time=r.total_time,
            servings=r.servings,
            difficulty=r.difficulty,
            image_url=r.image_url,
            is_favorite=r.is_favorite,
            rating=r.rating,
            times_cooked=r.times_cooked,
            is_archived=r.is_archived,
            created_at=r.created_at,
            ingredient_count=len(r.ingredients),
            tags=r.tags,
            required_equipment=r.required_equipment,
        )
        for r in recent_result.scalars().all()
    ]

    # Recently cooked
    recent_cooked_query = (
        select(CookingHistory)
        .where(CookingHistory.user_id == current_user.id)
        .order_by(desc(CookingHistory.cooked_at))
        .limit(5)
    )
    recent_cooked_result = await db.execute(recent_cooked_query)
    history_items = recent_cooked_result.scalars().all()

    recipe_ids = [h.recipe_id for h in history_items]
    if recipe_ids:
        names_query = select(Recipe.id, Recipe.name).where(Recipe.id.in_(recipe_ids))
        names_result = await db.execute(names_query)
        recipe_names = {r.id: r.name for r in names_result.all()}
    else:
        recipe_names = {}

    recently_cooked = [
        CookingHistoryResponse(
            id=h.id,
            user_id=h.user_id,
            recipe_id=h.recipe_id,
            cooked_at=h.cooked_at,
            servings_made=h.servings_made,
            notes=h.notes,
            rating=h.rating,
            created_at=h.created_at,
            recipe_name=recipe_names.get(h.recipe_id),
        )
        for h in history_items
    ]

    # Average times
    avg_query = select(
        func.avg(Recipe.prep_time).label("avg_prep"),
        func.avg(Recipe.cook_time).label("avg_cook"),
        func.sum(Recipe.times_cooked).label("total_cooked"),
    ).where(Recipe.user_id == current_user.id, Recipe.is_archived == False)
    avg_result = await db.execute(avg_query)
    avg_row = avg_result.one()

    return RecipeAnalytics(
        total_recipes=total,
        total_favorites=favorites,
        total_archived=archived,
        by_category=by_category,
        by_cuisine=by_cuisine,
        by_difficulty=by_difficulty,
        most_cooked=most_cooked,
        recently_added=recently_added,
        recently_cooked=recently_cooked,
        avg_prep_time=float(avg_row.avg_prep) if avg_row.avg_prep else None,
        avg_cook_time=float(avg_row.avg_cook) if avg_row.avg_cook else None,
        total_times_cooked=avg_row.total_cooked or 0,
    )


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
    try:
        # Fetch all dietary restrictions and nutritional preferences for the user's profiles
        from app.models.profile import Profile
        from app.models.dietary_restriction import DietaryRestriction, RestrictionType
        from app.models.nutritional_preference import NutritionalPreference
        from app.schemas.nutritional_preference import DIET_TYPE_RESTRICTIVENESS

        profiles_result = await db.execute(
            select(Profile)
            .options(
                selectinload(Profile.dietary_restrictions),
                selectinload(Profile.nutritional_preference)
            )
            .where(
                and_(
                    Profile.user_id == current_user.id,
                    Profile.is_archived == False
                )
            )
        )
        profiles = profiles_result.scalars().all()

        # Collect all excluded ingredients from all profiles
        household_excluded = set()
        household_allergies = set()
        household_dislikes = set()

        # Collect nutritional preferences
        all_diet_types = []
        all_goals = set()
        all_preferences = set()

        for profile in profiles:
            # Dietary restrictions
            for restriction in profile.dietary_restrictions:
                ingredient = restriction.ingredient_name.lower()
                household_excluded.add(ingredient)
                if restriction.restriction_type == RestrictionType.ALLERGY.value:
                    household_allergies.add(ingredient)
                else:
                    household_dislikes.add(ingredient)

            # Nutritional preferences
            if profile.nutritional_preference:
                pref = profile.nutritional_preference
                all_diet_types.append(pref.diet_type)
                all_goals.update(pref.goals or [])
                all_preferences.update(pref.preferences or [])

        # Determine most restrictive diet type
        combined_diet_type = "omnivore"
        for diet in DIET_TYPE_RESTRICTIVENESS:
            if diet in all_diet_types:
                combined_diet_type = diet
                break

        # Build dietary restrictions list for AI
        dietary_restrictions_for_ai = list(data.dietary_restrictions or [])

        # Add diet type as restriction if not omnivore
        if combined_diet_type != "omnivore":
            dietary_restrictions_for_ai.append(combined_diet_type)

        # Add nutritional goals as restrictions/preferences
        goal_labels = {
            "high_protein": "high-protein",
            "low_carb": "low-carb",
            "low_fat": "low-fat",
            "low_sodium": "low-sodium",
            "high_fiber": "high-fiber",
            "low_sugar": "low-sugar",
            "calorie_conscious": "low-calorie",
        }
        for goal in all_goals:
            if goal in goal_labels:
                dietary_restrictions_for_ai.append(goal_labels[goal])

        # Combine with user-provided exclude_ingredients
        all_excluded = list(household_excluded)
        if data.exclude_ingredients:
            for ing in data.exclude_ingredients:
                if ing.lower() not in household_excluded:
                    all_excluded.append(ing)

        # Fetch available ingredients from groceries and pantry if requested
        available_ingredients = list(data.include_ingredients or [])
        if data.use_available_ingredients:
            from app.models.grocery import Grocery
            from app.models.pantry import PantryItem

            # Fetch grocery items (not archived)
            groceries_result = await db.execute(
                select(Grocery.item_name)
                .where(
                    and_(
                        Grocery.user_id == current_user.id,
                        Grocery.is_archived == False
                    )
                )
            )
            grocery_names = [name for (name,) in groceries_result.fetchall()]

            # Fetch pantry items (not archived)
            pantry_result = await db.execute(
                select(PantryItem.item_name)
                .where(
                    and_(
                        PantryItem.user_id == current_user.id,
                        PantryItem.is_archived == False
                    )
                )
            )
            pantry_names = [name for (name,) in pantry_result.fetchall()]

            # Combine all available ingredients (remove duplicates)
            all_available = set(grocery_names + pantry_names)
            for ing in all_available:
                if ing.lower() not in [i.lower() for i in available_ingredients]:
                    available_ingredients.append(ing)

        suggestions = await ai_service.suggest_recipes(
            cuisine_type=data.cuisine_type.value if data.cuisine_type else None,
            meal_type=data.meal_type.value if data.meal_type else None,
            category=data.category.value if data.category else None,
            servings=data.servings,
            max_prep_time=data.max_prep_time,
            max_cook_time=data.max_cook_time,
            difficulty=data.difficulty.value if data.difficulty else None,
            dietary_restrictions=dietary_restrictions_for_ai if dietary_restrictions_for_ai else None,
            include_ingredients=available_ingredients if available_ingredients else None,
            exclude_ingredients=all_excluded if all_excluded else None,
            count=data.count,
            use_only_available=data.use_available_ingredients and len(available_ingredients) > 0,
        )

        # Convert to response models
        suggestion_items = []
        for s in suggestions:
            # Ensure ingredients are properly formatted
            ingredients = []
            for ing in s.get("ingredients", []):
                ingredients.append({
                    "ingredient_name": ing.get("ingredient_name", ""),
                    "quantity": ing.get("quantity"),
                    "unit": ing.get("unit"),
                    "category": ing.get("category"),
                })

            # Parse required equipment
            required_equipment = None
            if s.get("required_equipment"):
                required_equipment = []
                for eq in s.get("required_equipment", []):
                    required_equipment.append({
                        "equipment_name": eq.get("equipment_name", ""),
                        "category": eq.get("category"),
                        "is_required": eq.get("is_required", True),
                        "substitute_note": eq.get("substitute_note"),
                    })

            # Parse techniques
            techniques = None
            if s.get("techniques"):
                techniques = []
                for tech in s.get("techniques", []):
                    techniques.append({
                        "skill_name": tech.get("skill_name", ""),
                        "category": tech.get("category"),
                        "difficulty": tech.get("difficulty"),
                        "description": tech.get("description"),
                    })

            # Parse seasonal info
            seasonal_info = None
            if s.get("seasonal_info"):
                seasonal_info = []
                for sea in s.get("seasonal_info", []):
                    seasonal_info.append({
                        "ingredient_name": sea.get("ingredient_name", ""),
                        "peak_months": sea.get("peak_months"),
                        "available_months": sea.get("available_months"),
                        "substitute_out_of_season": sea.get("substitute_out_of_season"),
                    })

            suggestion_items.append(RecipeSuggestionItem(
                name=s.get("name", "Untitled Recipe"),
                description=s.get("description", ""),
                category=s.get("category"),
                cuisine_type=s.get("cuisine_type"),
                prep_time=s.get("prep_time"),
                cook_time=s.get("cook_time"),
                servings=s.get("servings", data.servings),
                difficulty=s.get("difficulty"),
                instructions=s.get("instructions", ""),
                ingredients=ingredients,
                tags=s.get("tags"),
                dietary_info=s.get("dietary_info"),
                estimated_calories=s.get("estimated_calories"),
                tips=s.get("tips"),
                required_equipment=required_equipment,
                techniques=techniques,
                seasonal_info=seasonal_info,
                best_season_months=s.get("best_season_months"),
            ))

        filters_applied = {
            "cuisine_type": data.cuisine_type.value if data.cuisine_type else None,
            "meal_type": data.meal_type.value if data.meal_type else None,
            "category": data.category.value if data.category else None,
            "servings": data.servings,
            "difficulty": data.difficulty.value if data.difficulty else None,
            "excluded_ingredients": all_excluded if all_excluded else [],
            "household_allergies": list(household_allergies),
            "household_dislikes": list(household_dislikes),
            "diet_type": combined_diet_type,
            "nutritional_goals": list(all_goals),
            "meal_preferences": list(all_preferences),
        }

        return RecipeSuggestionResponse(
            suggestions=suggestion_items,
            total_count=len(suggestion_items),
            filters_applied=filters_applied,
            success=True,
            message=f"Generated {len(suggestion_items)} recipe suggestions",
        )

    except Exception as e:
        print(f"[Recipes] Error generating suggestions: {e}")
        import traceback
        print(f"[Recipes] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate recipe suggestions: {str(e)}",
        )


# ============ Import/Parse ============

@router.post("/parse-text", response_model=ParseRecipeResponse)
async def parse_recipe_text(
    data: ParseRecipeTextRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse free-form text into a recipe."""
    try:
        parsed_recipes = await ai_service.parse_recipe_text(
            text=data.text,
            default_category=data.default_category.value if data.default_category else None,
            default_servings=data.default_servings,
            db=db,
            user_id=current_user.id,
        )

        return ParseRecipeResponse(
            parsed_recipes=parsed_recipes,
            raw_text=data.text,
            success=True,
            message=f"Parsed {len(parsed_recipes)} recipe(s)",
        )
    except Exception as e:
        print(f"[Recipe Parse] Error: {e}")
        return ParseRecipeResponse(
            parsed_recipes=[],
            raw_text=data.text,
            success=False,
            message=str(e),
        )


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
    try:
        audio_content = await audio.read()

        parsed_recipes = await ai_service.parse_recipe_voice(
            audio_content=audio_content,
            filename=audio.filename or "recording.webm",
            language=language,
            default_category=default_category,
            default_servings=default_servings,
            db=db,
            user_id=current_user.id,
        )

        return ParseRecipeResponse(
            parsed_recipes=parsed_recipes,
            success=True,
            message=f"Parsed {len(parsed_recipes)} recipe(s) from voice",
        )
    except Exception as e:
        print(f"[Recipe Voice Parse] Error: {e}")
        return ParseRecipeResponse(
            parsed_recipes=[],
            success=False,
            message=str(e),
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
    try:
        image_data = []
        for img in images:
            content = await img.read()
            image_data.append({
                "content": content,
                "filename": img.filename,
            })

        parsed_recipes = await ai_service.parse_recipe_images(
            images=image_data,
            import_type=import_type,
            default_category=default_category,
            default_servings=default_servings,
            db=db,
            user_id=current_user.id,
        )

        return ParseRecipeResponse(
            parsed_recipes=parsed_recipes,
            success=True,
            message=f"Parsed {len(parsed_recipes)} recipe(s) from image(s)",
        )
    except Exception as e:
        print(f"[Recipe Image Parse] Error: {e}")
        return ParseRecipeResponse(
            parsed_recipes=[],
            success=False,
            message=str(e),
        )


@router.post("/parse-url", response_model=ParseRecipeResponse)
async def parse_recipe_url(
    data: ParseRecipeUrlRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Parse recipe from a URL (website)."""
    try:
        parsed_recipes = await ai_service.parse_recipe_url(
            url=data.url,
            db=db,
            user_id=current_user.id,
        )

        return ParseRecipeResponse(
            parsed_recipes=parsed_recipes,
            source_url=data.url,
            success=True,
            message=f"Parsed {len(parsed_recipes)} recipe(s) from URL",
        )
    except Exception as e:
        print(f"[Recipe URL Parse] Error: {e}")
        return ParseRecipeResponse(
            parsed_recipes=[],
            source_url=data.url,
            success=False,
            message=str(e),
        )


# ============ Shopping List Integration ============

@router.post("/{recipe_id}/add-to-shopping-list")
async def add_recipe_to_shopping_list(
    recipe_id: UUID,
    data: AddToShoppingListRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add recipe ingredients to a shopping list."""
    # Get recipe with ingredients
    query = (
        select(Recipe)
        .where(Recipe.id == recipe_id, Recipe.user_id == current_user.id)
        .options(selectinload(Recipe.ingredients))
    )
    result = await db.execute(query)
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Calculate scale factor if servings differ
    scale_factor = 1.0
    if data.servings and data.servings != recipe.servings:
        scale_factor = data.servings / recipe.servings

    # Filter out excluded ingredients
    exclude_ids = set(data.exclude_ingredient_ids or [])
    ingredients_to_add = [
        ing for ing in recipe.ingredients
        if ing.id not in exclude_ids
    ]

    # TODO: Actually add to shopping list
    # This would integrate with the shopping list module

    return {
        "success": True,
        "message": f"Added {len(ingredients_to_add)} ingredients to shopping list",
        "ingredients_count": len(ingredients_to_add),
        "scale_factor": scale_factor,
    }
