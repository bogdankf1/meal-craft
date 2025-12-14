"""Recipe Schemas"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Any
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field, HttpUrl


class RecipeCategory(str, Enum):
    """Recipe category enum."""
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    DESSERT = "dessert"
    SNACK = "snack"
    APPETIZER = "appetizer"
    SIDE = "side"
    BEVERAGE = "beverage"
    OTHER = "other"


class RecipeDifficulty(str, Enum):
    """Recipe difficulty enum."""
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


# ============ Ingredient Schemas ============

class RecipeIngredientCreate(BaseModel):
    """Schema for creating a recipe ingredient."""
    ingredient_name: str = Field(..., min_length=1, max_length=255)
    quantity: Optional[Decimal] = Field(None, ge=0)
    unit: Optional[str] = Field(None, max_length=50)
    category: Optional[str] = Field(None, max_length=100)


class RecipeIngredientResponse(BaseModel):
    """Schema for recipe ingredient response."""
    id: UUID
    recipe_id: UUID
    ingredient_name: str
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RecipeIngredientScaled(BaseModel):
    """Schema for scaled recipe ingredient (for serving adjustments)."""
    ingredient_name: str
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    original_quantity: Optional[Decimal] = None
    scale_factor: float = 1.0


# ============ Instruction Schemas ============

class InstructionStep(BaseModel):
    """Schema for a single instruction step."""
    step: int = Field(..., ge=1)
    text: str = Field(..., min_length=1)
    duration_minutes: Optional[int] = Field(None, ge=0)
    tip: Optional[str] = None


# ============ Nutrition Schemas ============

class RecipeNutritionCreate(BaseModel):
    """Schema for creating recipe nutrition info."""
    calories: Optional[int] = Field(None, ge=0)
    protein_g: Optional[Decimal] = Field(None, ge=0)
    carbs_g: Optional[Decimal] = Field(None, ge=0)
    fat_g: Optional[Decimal] = Field(None, ge=0)
    fiber_g: Optional[Decimal] = Field(None, ge=0)
    sugar_g: Optional[Decimal] = Field(None, ge=0)
    sodium_mg: Optional[Decimal] = Field(None, ge=0)


class RecipeNutritionResponse(BaseModel):
    """Schema for recipe nutrition response."""
    id: UUID
    recipe_id: UUID
    calories: Optional[int] = None
    protein_g: Optional[Decimal] = None
    carbs_g: Optional[Decimal] = None
    fat_g: Optional[Decimal] = None
    fiber_g: Optional[Decimal] = None
    sugar_g: Optional[Decimal] = None
    sodium_mg: Optional[Decimal] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============ Create/Update Schemas ============

class RecipeCreate(BaseModel):
    """Schema for creating a recipe."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[RecipeCategory] = None
    cuisine_type: Optional[str] = Field(None, max_length=100)
    dietary_restrictions: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    prep_time: Optional[int] = Field(None, ge=0, description="Prep time in minutes")
    cook_time: Optional[int] = Field(None, ge=0, description="Cook time in minutes")
    servings: int = Field(default=2, ge=1)
    difficulty: Optional[RecipeDifficulty] = None
    instructions: str = Field(..., min_length=1, description="Recipe instructions")
    instructions_json: Optional[List[InstructionStep]] = None
    source: Optional[str] = Field(None, max_length=500)
    source_url: Optional[str] = Field(None, max_length=1000)
    notes: Optional[str] = None
    is_favorite: bool = False
    # Ingredients
    ingredients: List[RecipeIngredientCreate] = Field(..., min_length=1)
    # Nutrition (optional)
    nutrition: Optional[RecipeNutritionCreate] = None


class RecipeBatchCreate(BaseModel):
    """Schema for batch creating recipes."""
    items: List[RecipeCreate] = Field(..., min_length=1)


class RecipeUpdate(BaseModel):
    """Schema for updating a recipe."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[RecipeCategory] = None
    cuisine_type: Optional[str] = Field(None, max_length=100)
    dietary_restrictions: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    prep_time: Optional[int] = Field(None, ge=0)
    cook_time: Optional[int] = Field(None, ge=0)
    servings: Optional[int] = Field(None, ge=1)
    difficulty: Optional[RecipeDifficulty] = None
    instructions: Optional[str] = None
    instructions_json: Optional[List[InstructionStep]] = None
    source: Optional[str] = Field(None, max_length=500)
    source_url: Optional[str] = Field(None, max_length=1000)
    notes: Optional[str] = None
    is_favorite: Optional[bool] = None
    is_archived: Optional[bool] = None
    rating: Optional[int] = Field(None, ge=1, le=5)


class RecipeUpdateIngredients(BaseModel):
    """Schema for updating recipe ingredients."""
    ingredients: List[RecipeIngredientCreate] = Field(..., min_length=1)


# ============ Response Schemas ============

class RecipeResponse(BaseModel):
    """Schema for recipe response."""
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    cuisine_type: Optional[str] = None
    dietary_restrictions: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    prep_time: Optional[int] = None
    cook_time: Optional[int] = None
    servings: int = 2
    difficulty: Optional[str] = None
    instructions: str
    instructions_json: Optional[List[dict]] = None
    source: Optional[str] = None
    source_url: Optional[str] = None
    image_url: Optional[str] = None
    notes: Optional[str] = None
    is_public: bool = False
    is_ai_generated: bool = False
    is_favorite: bool = False
    rating: Optional[int] = None
    times_cooked: int = 0
    is_archived: bool = False
    created_at: datetime
    updated_at: datetime
    # Computed fields
    total_time: Optional[int] = None
    last_cooked: Optional[datetime] = None
    # Related data
    ingredients: List[RecipeIngredientResponse] = []
    nutrition: Optional[RecipeNutritionResponse] = None
    collection_ids: List[UUID] = []

    class Config:
        from_attributes = True


class RecipeListItem(BaseModel):
    """Schema for recipe list item (lighter weight for lists)."""
    id: UUID
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    cuisine_type: Optional[str] = None
    prep_time: Optional[int] = None
    cook_time: Optional[int] = None
    total_time: Optional[int] = None
    servings: int = 2
    difficulty: Optional[str] = None
    image_url: Optional[str] = None
    is_favorite: bool = False
    rating: Optional[int] = None
    times_cooked: int = 0
    is_archived: bool = False
    created_at: datetime
    ingredient_count: int = 0
    tags: Optional[List[str]] = None

    class Config:
        from_attributes = True


class RecipeListResponse(BaseModel):
    """Schema for paginated recipe list response."""
    items: List[RecipeListItem]
    total: int
    page: int
    per_page: int
    total_pages: int


class RecipeScaledResponse(BaseModel):
    """Schema for scaled recipe (with adjusted servings)."""
    recipe: RecipeResponse
    scale_factor: float
    scaled_servings: int
    scaled_ingredients: List[RecipeIngredientScaled]


# ============ Filter Schemas ============

class RecipeFilters(BaseModel):
    """Schema for recipe filters."""
    search: Optional[str] = None
    category: Optional[str] = None
    cuisine_type: Optional[str] = None
    difficulty: Optional[str] = None
    is_favorite: Optional[bool] = None
    is_archived: Optional[bool] = None
    tags: Optional[List[str]] = None
    max_prep_time: Optional[int] = None
    max_cook_time: Optional[int] = None
    max_total_time: Optional[int] = None
    min_rating: Optional[int] = None
    collection_id: Optional[UUID] = None
    page: int = 1
    per_page: int = 20
    sort_by: str = "created_at"
    sort_order: str = "desc"


# ============ Cooking History Schemas ============

class CookingHistoryCreate(BaseModel):
    """Schema for recording cooking history."""
    recipe_id: UUID
    cooked_at: Optional[datetime] = None  # Defaults to now
    servings_made: Optional[int] = Field(None, ge=1)
    notes: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)


class CookingHistoryResponse(BaseModel):
    """Schema for cooking history response."""
    id: UUID
    user_id: UUID
    recipe_id: UUID
    cooked_at: datetime
    servings_made: Optional[int] = None
    notes: Optional[str] = None
    rating: Optional[int] = None
    created_at: datetime
    # Include recipe name for convenience
    recipe_name: Optional[str] = None

    class Config:
        from_attributes = True


class CookingHistoryListResponse(BaseModel):
    """Schema for cooking history list response."""
    items: List[CookingHistoryResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# ============ Collection Schemas ============

class RecipeCollectionCreate(BaseModel):
    """Schema for creating a recipe collection."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    color: Optional[str] = Field(None, max_length=20)
    icon: Optional[str] = Field(None, max_length=50)


class RecipeCollectionUpdate(BaseModel):
    """Schema for updating a recipe collection."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    color: Optional[str] = Field(None, max_length=20)
    icon: Optional[str] = Field(None, max_length=50)
    is_archived: Optional[bool] = None


class RecipeCollectionResponse(BaseModel):
    """Schema for recipe collection response."""
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    is_archived: bool = False
    created_at: datetime
    updated_at: datetime
    recipe_count: int = 0

    class Config:
        from_attributes = True


class RecipeCollectionWithRecipes(BaseModel):
    """Schema for collection with its recipes."""
    collection: RecipeCollectionResponse
    recipes: List[RecipeListItem]


class AddToCollectionRequest(BaseModel):
    """Request to add recipes to a collection."""
    recipe_ids: List[UUID] = Field(..., min_length=1)


class RemoveFromCollectionRequest(BaseModel):
    """Request to remove recipes from a collection."""
    recipe_ids: List[UUID] = Field(..., min_length=1)


# ============ Bulk Action Schemas ============

class BulkActionRequest(BaseModel):
    """Request for bulk operations."""
    ids: List[UUID] = Field(..., min_length=1, description="List of recipe IDs")


class BulkActionResponse(BaseModel):
    """Response for bulk operations."""
    success: bool
    affected_count: int
    message: str


# ============ Analytics Schemas ============

class RecipesByCategory(BaseModel):
    """Recipes breakdown by category."""
    category: str
    count: int


class RecipesByCuisine(BaseModel):
    """Recipes breakdown by cuisine."""
    cuisine: str
    count: int


class RecipesByDifficulty(BaseModel):
    """Recipes breakdown by difficulty."""
    difficulty: str
    count: int


class MostCookedRecipe(BaseModel):
    """Most cooked recipe."""
    id: UUID
    name: str
    times_cooked: int
    category: Optional[str] = None


class RecipeAnalytics(BaseModel):
    """Recipe analytics data."""
    total_recipes: int
    total_favorites: int
    total_archived: int
    by_category: List[RecipesByCategory]
    by_cuisine: List[RecipesByCuisine]
    by_difficulty: List[RecipesByDifficulty]
    most_cooked: List[MostCookedRecipe]
    recently_added: List[RecipeListItem]
    recently_cooked: List[CookingHistoryResponse]
    avg_prep_time: Optional[float] = None
    avg_cook_time: Optional[float] = None
    total_times_cooked: int = 0


class MonthlyRecipeData(BaseModel):
    """Monthly recipe statistics."""
    month: str
    month_label: str
    recipes_added: int
    times_cooked: int


class RecipeHistory(BaseModel):
    """Recipe history data."""
    period_months: int
    total_recipes_added: int
    total_times_cooked: int
    monthly_data: List[MonthlyRecipeData]


# ============ Parse Schemas (Import) ============

class ParseRecipeTextRequest(BaseModel):
    """Request to parse text for a recipe."""
    text: str = Field(..., min_length=1)
    default_category: Optional[RecipeCategory] = None
    default_servings: int = Field(default=4, ge=1)


class ParseRecipeUrlRequest(BaseModel):
    """Request to parse a recipe from URL."""
    url: str = Field(..., min_length=1)


class ParseRecipeResponse(BaseModel):
    """Response from recipe parsing."""
    parsed_recipes: List[RecipeCreate]
    raw_text: Optional[str] = None
    source_url: Optional[str] = None
    success: bool
    message: Optional[str] = None


# ============ Shopping List Integration ============

class AddToShoppingListRequest(BaseModel):
    """Request to add recipe ingredients to shopping list."""
    recipe_id: UUID
    servings: Optional[int] = None  # If different from recipe default
    shopping_list_id: Optional[UUID] = None  # Create new if not provided
    exclude_ingredient_ids: Optional[List[UUID]] = None  # Ingredients to skip


# ============ AI Recipe Suggestion Schemas ============

class CuisineType(str, Enum):
    """Cuisine type enum."""
    ITALIAN = "italian"
    MEXICAN = "mexican"
    CHINESE = "chinese"
    JAPANESE = "japanese"
    INDIAN = "indian"
    THAI = "thai"
    FRENCH = "french"
    AMERICAN = "american"
    MEDITERRANEAN = "mediterranean"
    KOREAN = "korean"
    VIETNAMESE = "vietnamese"
    GREEK = "greek"
    SPANISH = "spanish"
    MIDDLE_EASTERN = "middle_eastern"
    UKRAINIAN = "ukrainian"
    OTHER = "other"


class MealType(str, Enum):
    """Meal/food type enum."""
    QUICK_EASY = "quick_easy"
    HEALTHY = "healthy"
    COMFORT_FOOD = "comfort_food"
    VEGETARIAN = "vegetarian"
    VEGAN = "vegan"
    LOW_CARB = "low_carb"
    HIGH_PROTEIN = "high_protein"
    BUDGET_FRIENDLY = "budget_friendly"
    GOURMET = "gourmet"
    KID_FRIENDLY = "kid_friendly"
    ONE_POT = "one_pot"
    MEAL_PREP = "meal_prep"
    PARTY_FOOD = "party_food"
    SOUP_STEW = "soup_stew"
    SALAD = "salad"
    PASTA = "pasta"
    RICE_GRAIN = "rice_grain"
    SEAFOOD = "seafood"
    MEAT = "meat"
    BAKED_GOODS = "baked_goods"


class RecipeSuggestionRequest(BaseModel):
    """Request for AI recipe suggestions."""
    cuisine_type: Optional[CuisineType] = Field(None, description="Type of cuisine")
    meal_type: Optional[MealType] = Field(None, description="Type of meal/food")
    category: Optional[RecipeCategory] = Field(None, description="Recipe category (breakfast, lunch, etc.)")
    servings: int = Field(default=4, ge=1, le=20, description="Number of servings")
    max_prep_time: Optional[int] = Field(None, ge=5, le=180, description="Maximum prep time in minutes")
    max_cook_time: Optional[int] = Field(None, ge=5, le=480, description="Maximum cook time in minutes")
    difficulty: Optional[RecipeDifficulty] = Field(None, description="Recipe difficulty level")
    dietary_restrictions: Optional[List[str]] = Field(None, description="Dietary restrictions to consider")
    include_ingredients: Optional[List[str]] = Field(None, description="Ingredients to include")
    exclude_ingredients: Optional[List[str]] = Field(None, description="Ingredients to exclude")
    count: int = Field(default=6, ge=1, le=12, description="Number of suggestions to generate")


class RecipeSuggestionItem(BaseModel):
    """A single recipe suggestion from AI."""
    name: str
    description: str
    category: Optional[str] = None
    cuisine_type: Optional[str] = None
    prep_time: Optional[int] = None
    cook_time: Optional[int] = None
    servings: int = 4
    difficulty: Optional[str] = None
    instructions: str
    ingredients: List[RecipeIngredientCreate]
    tags: Optional[List[str]] = None
    dietary_info: Optional[List[str]] = None
    estimated_calories: Optional[int] = None
    tips: Optional[str] = None


class RecipeSuggestionResponse(BaseModel):
    """Response containing AI recipe suggestions."""
    suggestions: List[RecipeSuggestionItem]
    total_count: int
    filters_applied: dict
    success: bool
    message: Optional[str] = None
