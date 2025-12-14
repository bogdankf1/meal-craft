import { baseApi } from "./base-api";

// Recipe category enum matching backend
export type RecipeCategory =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "dessert"
  | "snack"
  | "appetizer"
  | "side"
  | "beverage"
  | "other";

export const RECIPE_CATEGORIES: { value: RecipeCategory; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "dessert", label: "Dessert" },
  { value: "snack", label: "Snack" },
  { value: "appetizer", label: "Appetizer" },
  { value: "side", label: "Side Dish" },
  { value: "beverage", label: "Beverage" },
  { value: "other", label: "Other" },
];

// Recipe difficulty enum matching backend
export type RecipeDifficulty = "easy" | "medium" | "hard";

export const RECIPE_DIFFICULTIES: { value: RecipeDifficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

// ============ Ingredient Types ============

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  created_at: string;
}

export interface RecipeIngredientCreate {
  ingredient_name: string;
  quantity?: number | null;
  unit?: string | null;
  category?: string | null;
}

export interface RecipeIngredientScaled {
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  original_quantity: number | null;
  scale_factor: number;
}

// ============ Instruction Types ============

export interface InstructionStep {
  step: number;
  text: string;
  duration_minutes?: number | null;
  tip?: string | null;
}

// ============ Integration Types (Equipment, Techniques, Seasonality) ============

export interface RecipeEquipment {
  equipment_name: string;
  category?: string | null;
  is_required: boolean;
  substitute_note?: string | null;
}

export interface RecipeTechnique {
  skill_name: string;
  category?: string | null;
  difficulty?: string | null;
  description?: string | null;
}

export interface RecipeSeasonalIngredient {
  ingredient_name: string;
  peak_months?: number[] | null;
  available_months?: number[] | null;
  substitute_out_of_season?: string | null;
}

// ============ Nutrition Types ============

export interface RecipeNutrition {
  id: string;
  recipe_id: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  created_at: string;
}

export interface RecipeNutritionCreate {
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  fiber_g?: number | null;
  sugar_g?: number | null;
  sodium_mg?: number | null;
}

// ============ Recipe Types ============

export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string | null;
  cuisine_type: string | null;
  dietary_restrictions: string[] | null;
  tags: string[] | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number;
  difficulty: string | null;
  instructions: string;
  instructions_json: InstructionStep[] | null;
  source: string | null;
  source_url: string | null;
  image_url: string | null;
  notes: string | null;
  is_public: boolean;
  is_ai_generated: boolean;
  is_favorite: boolean;
  rating: number | null;
  times_cooked: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  // Integration fields
  required_equipment: RecipeEquipment[] | null;
  techniques: RecipeTechnique[] | null;
  seasonal_info: RecipeSeasonalIngredient[] | null;
  best_season_months: number[] | null;
  // Computed fields
  total_time: number | null;
  last_cooked: string | null;
  // Related data
  ingredients: RecipeIngredient[];
  nutrition: RecipeNutrition | null;
  collection_ids: string[];
}

export interface RecipeListItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  cuisine_type: string | null;
  prep_time: number | null;
  cook_time: number | null;
  total_time: number | null;
  servings: number;
  difficulty: string | null;
  image_url: string | null;
  is_favorite: boolean;
  rating: number | null;
  times_cooked: number;
  is_archived: boolean;
  created_at: string;
  ingredient_count: number;
  tags: string[] | null;
}

export interface RecipeListResponse {
  items: RecipeListItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface RecipeFilters {
  search?: string;
  category?: string;
  cuisine_type?: string;
  difficulty?: string;
  is_favorite?: boolean;
  is_archived?: boolean;
  tags?: string;
  max_prep_time?: number;
  max_cook_time?: number;
  max_total_time?: number;
  min_rating?: number;
  collection_id?: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface CreateRecipeInput {
  name: string;
  description?: string | null;
  category?: RecipeCategory | null;
  cuisine_type?: string | null;
  dietary_restrictions?: string[] | null;
  tags?: string[] | null;
  prep_time?: number | null;
  cook_time?: number | null;
  servings?: number;
  difficulty?: RecipeDifficulty | null;
  instructions: string;
  instructions_json?: InstructionStep[] | null;
  source?: string | null;
  source_url?: string | null;
  notes?: string | null;
  is_favorite?: boolean;
  ingredients: RecipeIngredientCreate[];
  nutrition?: RecipeNutritionCreate | null;
  // Integration fields
  required_equipment?: RecipeEquipment[] | null;
  techniques?: RecipeTechnique[] | null;
  seasonal_info?: RecipeSeasonalIngredient[] | null;
  best_season_months?: number[] | null;
}

export interface UpdateRecipeInput {
  name?: string;
  description?: string | null;
  category?: RecipeCategory | null;
  cuisine_type?: string | null;
  dietary_restrictions?: string[] | null;
  tags?: string[] | null;
  prep_time?: number | null;
  cook_time?: number | null;
  servings?: number;
  difficulty?: RecipeDifficulty | null;
  instructions?: string;
  instructions_json?: InstructionStep[] | null;
  source?: string | null;
  source_url?: string | null;
  notes?: string | null;
  is_favorite?: boolean;
  is_archived?: boolean;
  rating?: number | null;
  // Integration fields
  required_equipment?: RecipeEquipment[] | null;
  techniques?: RecipeTechnique[] | null;
  seasonal_info?: RecipeSeasonalIngredient[] | null;
  best_season_months?: number[] | null;
}

// ============ Scaled Recipe Types ============

export interface RecipeScaledResponse {
  recipe: Recipe;
  scale_factor: number;
  scaled_servings: number;
  scaled_ingredients: RecipeIngredientScaled[];
}

// ============ Cooking History Types ============

export interface CookingHistory {
  id: string;
  user_id: string;
  recipe_id: string;
  cooked_at: string;
  servings_made: number | null;
  notes: string | null;
  rating: number | null;
  created_at: string;
  recipe_name: string | null;
}

export interface CookingHistoryListResponse {
  items: CookingHistory[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface RecordCookingInput {
  recipe_id: string;
  cooked_at?: string | null;
  servings_made?: number | null;
  notes?: string | null;
  rating?: number | null;
}

// ============ Collection Types ============

export interface RecipeCollection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  recipe_count: number;
}

export interface RecipeCollectionWithRecipes {
  collection: RecipeCollection;
  recipes: RecipeListItem[];
}

export interface CreateCollectionInput {
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
}

export interface UpdateCollectionInput {
  name?: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  is_archived?: boolean;
}

// ============ Bulk Action Types ============

export interface BulkActionResponse {
  success: boolean;
  affected_count: number;
  message: string;
}

// ============ Analytics Types ============

export interface RecipesByCategory {
  category: string;
  count: number;
}

export interface RecipesByCuisine {
  cuisine: string;
  count: number;
}

export interface RecipesByDifficulty {
  difficulty: string;
  count: number;
}

export interface MostCookedRecipe {
  id: string;
  name: string;
  times_cooked: number;
  category: string | null;
}

export interface RecipeAnalytics {
  total_recipes: number;
  total_favorites: number;
  total_archived: number;
  by_category: RecipesByCategory[];
  by_cuisine: RecipesByCuisine[];
  by_difficulty: RecipesByDifficulty[];
  most_cooked: MostCookedRecipe[];
  recently_added: RecipeListItem[];
  recently_cooked: CookingHistory[];
  avg_prep_time: number | null;
  avg_cook_time: number | null;
  total_times_cooked: number;
}

export interface MonthlyRecipeData {
  month: string;
  month_label: string;
  recipes_added: number;
  times_cooked: number;
}

export interface RecipeHistory {
  period_months: number;
  total_recipes_added: number;
  total_times_cooked: number;
  monthly_data: MonthlyRecipeData[];
}

// ============ Parse Types ============

export interface ParseTextRequest {
  text: string;
  default_category?: RecipeCategory | null;
  default_servings?: number;
}

export interface ParseUrlRequest {
  url: string;
}

export interface ParseRecipeResponse {
  parsed_recipes: CreateRecipeInput[];
  raw_text?: string | null;
  source_url?: string | null;
  success: boolean;
  message?: string | null;
}

// ============ Shopping List Integration ============

export interface AddToShoppingListRequest {
  recipe_id: string;
  servings?: number | null;
  shopping_list_id?: string | null;
  exclude_ingredient_ids?: string[] | null;
}

// ============ AI Suggestion Types ============

export type CuisineType =
  | "italian"
  | "mexican"
  | "chinese"
  | "japanese"
  | "indian"
  | "thai"
  | "french"
  | "american"
  | "mediterranean"
  | "korean"
  | "vietnamese"
  | "greek"
  | "spanish"
  | "middle_eastern"
  | "ukrainian"
  | "other";

export const CUISINE_TYPES: { value: CuisineType; label: string }[] = [
  { value: "italian", label: "Italian" },
  { value: "mexican", label: "Mexican" },
  { value: "chinese", label: "Chinese" },
  { value: "japanese", label: "Japanese" },
  { value: "indian", label: "Indian" },
  { value: "thai", label: "Thai" },
  { value: "french", label: "French" },
  { value: "american", label: "American" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "korean", label: "Korean" },
  { value: "vietnamese", label: "Vietnamese" },
  { value: "greek", label: "Greek" },
  { value: "spanish", label: "Spanish" },
  { value: "middle_eastern", label: "Middle Eastern" },
  { value: "ukrainian", label: "Ukrainian" },
  { value: "other", label: "Other" },
];

export type MealType =
  | "quick_easy"
  | "healthy"
  | "comfort_food"
  | "vegetarian"
  | "vegan"
  | "low_carb"
  | "high_protein"
  | "budget_friendly"
  | "gourmet"
  | "kid_friendly"
  | "one_pot"
  | "meal_prep"
  | "party_food"
  | "soup_stew"
  | "salad"
  | "pasta"
  | "rice_grain"
  | "seafood"
  | "meat"
  | "baked_goods";

export const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "quick_easy", label: "Quick & Easy" },
  { value: "healthy", label: "Healthy" },
  { value: "comfort_food", label: "Comfort Food" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "low_carb", label: "Low Carb" },
  { value: "high_protein", label: "High Protein" },
  { value: "budget_friendly", label: "Budget Friendly" },
  { value: "gourmet", label: "Gourmet" },
  { value: "kid_friendly", label: "Kid Friendly" },
  { value: "one_pot", label: "One-Pot" },
  { value: "meal_prep", label: "Meal Prep" },
  { value: "party_food", label: "Party Food" },
  { value: "soup_stew", label: "Soups & Stews" },
  { value: "salad", label: "Salads" },
  { value: "pasta", label: "Pasta" },
  { value: "rice_grain", label: "Rice & Grains" },
  { value: "seafood", label: "Seafood" },
  { value: "meat", label: "Meat" },
  { value: "baked_goods", label: "Baked Goods" },
];

export interface RecipeSuggestionRequest {
  cuisine_type?: CuisineType | null;
  meal_type?: MealType | null;
  category?: RecipeCategory | null;
  servings?: number;
  max_prep_time?: number | null;
  max_cook_time?: number | null;
  difficulty?: RecipeDifficulty | null;
  dietary_restrictions?: string[] | null;
  include_ingredients?: string[] | null;
  exclude_ingredients?: string[] | null;
  count?: number;
}

export interface RecipeSuggestionItem {
  name: string;
  description: string;
  category: string | null;
  cuisine_type: string | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number;
  difficulty: string | null;
  instructions: string;
  ingredients: RecipeIngredientCreate[];
  tags: string[] | null;
  dietary_info: string[] | null;
  estimated_calories: number | null;
  tips: string | null;
  // Integration fields
  required_equipment: RecipeEquipment[] | null;
  techniques: RecipeTechnique[] | null;
  seasonal_info: RecipeSeasonalIngredient[] | null;
  best_season_months: number[] | null;
}

export interface RecipeSuggestionResponse {
  suggestions: RecipeSuggestionItem[];
  total_count: number;
  filters_applied: Record<string, unknown>;
  success: boolean;
  message: string | null;
}

// ============ API Definition ============

export const recipesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ============ Recipe CRUD ============

    // List recipes with filters
    getRecipes: builder.query<RecipeListResponse, RecipeFilters>({
      query: (params) => ({
        url: "/recipes",
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "Recipes" as const,
                id,
              })),
              { type: "Recipes", id: "LIST" },
            ]
          : [{ type: "Recipes", id: "LIST" }],
    }),

    // Get single recipe
    getRecipe: builder.query<Recipe, string>({
      query: (id) => `/recipes/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Recipes", id }],
    }),

    // Create recipes (batch)
    createRecipes: builder.mutation<Recipe[], CreateRecipeInput[]>({
      query: (items) => ({
        url: "/recipes",
        method: "POST",
        body: { items },
      }),
      invalidatesTags: [
        { type: "Recipes", id: "LIST" },
        { type: "Recipes", id: "ANALYTICS" },
        { type: "Recipes", id: "HISTORY" },
      ],
    }),

    // Update recipe
    updateRecipe: builder.mutation<Recipe, { id: string; data: UpdateRecipeInput }>({
      query: ({ id, data }) => ({
        url: `/recipes/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Recipes", id },
        { type: "Recipes", id: "LIST" },
        { type: "Recipes", id: "ANALYTICS" },
      ],
    }),

    // Update recipe ingredients
    updateRecipeIngredients: builder.mutation<
      Recipe,
      { id: string; ingredients: RecipeIngredientCreate[] }
    >({
      query: ({ id, ingredients }) => ({
        url: `/recipes/${id}/ingredients`,
        method: "PUT",
        body: { ingredients },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Recipes", id },
        { type: "Recipes", id: "LIST" },
      ],
    }),

    // Delete recipe
    deleteRecipe: builder.mutation<void, string>({
      query: (id) => ({
        url: `/recipes/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Recipes", id },
        { type: "Recipes", id: "LIST" },
        { type: "Recipes", id: "ANALYTICS" },
        { type: "Recipes", id: "HISTORY" },
      ],
    }),

    // ============ Scaling ============

    // Get scaled recipe
    getScaledRecipe: builder.query<RecipeScaledResponse, { id: string; servings: number }>({
      query: ({ id, servings }) => `/recipes/${id}/scale?servings=${servings}`,
    }),

    // ============ Favorites ============

    // Toggle favorite
    toggleFavorite: builder.mutation<Recipe, string>({
      query: (id) => ({
        url: `/recipes/${id}/favorite`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Recipes", id },
        { type: "Recipes", id: "LIST" },
        { type: "Recipes", id: "ANALYTICS" },
      ],
    }),

    // ============ Cooking History ============

    // Record cooking
    recordCooking: builder.mutation<CookingHistory, { id: string; data: RecordCookingInput }>({
      query: ({ id, data }) => ({
        url: `/recipes/${id}/cook`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Recipes", id },
        { type: "Recipes", id: "LIST" },
        { type: "Recipes", id: "ANALYTICS" },
        { type: "Recipes", id: "COOKING_HISTORY" },
      ],
    }),

    // Get cooking history
    getCookingHistory: builder.query<
      CookingHistoryListResponse,
      { page?: number; per_page?: number }
    >({
      query: (params) => ({
        url: "/recipes/history/all",
        params,
      }),
      providesTags: [{ type: "Recipes", id: "COOKING_HISTORY" }],
    }),

    // ============ Collections ============

    // Get all collections
    getCollections: builder.query<RecipeCollection[], { include_archived?: boolean }>({
      query: (params) => ({
        url: "/recipes/collections/all",
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "Recipes" as const,
                id: `COLLECTION_${id}`,
              })),
              { type: "Recipes", id: "COLLECTIONS" },
            ]
          : [{ type: "Recipes", id: "COLLECTIONS" }],
    }),

    // Get collection with recipes
    getCollectionWithRecipes: builder.query<RecipeCollectionWithRecipes, string>({
      query: (id) => `/recipes/collections/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Recipes", id: `COLLECTION_${id}` }],
    }),

    // Create collection
    createCollection: builder.mutation<RecipeCollection, CreateCollectionInput>({
      query: (data) => ({
        url: "/recipes/collections",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Recipes", id: "COLLECTIONS" }],
    }),

    // Update collection
    updateCollection: builder.mutation<
      RecipeCollection,
      { id: string; data: UpdateCollectionInput }
    >({
      query: ({ id, data }) => ({
        url: `/recipes/collections/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Recipes", id: `COLLECTION_${id}` },
        { type: "Recipes", id: "COLLECTIONS" },
      ],
    }),

    // Delete collection
    deleteCollection: builder.mutation<void, string>({
      query: (id) => ({
        url: `/recipes/collections/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Recipes", id: "COLLECTIONS" }],
    }),

    // Add recipes to collection
    addRecipesToCollection: builder.mutation<
      BulkActionResponse,
      { collectionId: string; recipeIds: string[] }
    >({
      query: ({ collectionId, recipeIds }) => ({
        url: `/recipes/collections/${collectionId}/add`,
        method: "POST",
        body: { recipe_ids: recipeIds },
      }),
      invalidatesTags: (_result, _error, { collectionId }) => [
        { type: "Recipes", id: `COLLECTION_${collectionId}` },
        { type: "Recipes", id: "LIST" },
      ],
    }),

    // Remove recipes from collection
    removeRecipesFromCollection: builder.mutation<
      BulkActionResponse,
      { collectionId: string; recipeIds: string[] }
    >({
      query: ({ collectionId, recipeIds }) => ({
        url: `/recipes/collections/${collectionId}/remove`,
        method: "POST",
        body: { recipe_ids: recipeIds },
      }),
      invalidatesTags: (_result, _error, { collectionId }) => [
        { type: "Recipes", id: `COLLECTION_${collectionId}` },
        { type: "Recipes", id: "LIST" },
      ],
    }),

    // ============ Bulk Actions ============

    // Bulk archive
    bulkArchiveRecipes: builder.mutation<BulkActionResponse, string[]>({
      query: (ids) => ({
        url: "/recipes/bulk-archive",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: (_result, _error, ids) => [
        { type: "Recipes", id: "LIST" },
        { type: "Recipes", id: "ANALYTICS" },
        ...ids.map((id) => ({ type: "Recipes" as const, id })),
      ],
    }),

    // Bulk unarchive
    bulkUnarchiveRecipes: builder.mutation<BulkActionResponse, string[]>({
      query: (ids) => ({
        url: "/recipes/bulk-unarchive",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: (_result, _error, ids) => [
        { type: "Recipes", id: "LIST" },
        { type: "Recipes", id: "ANALYTICS" },
        ...ids.map((id) => ({ type: "Recipes" as const, id })),
      ],
    }),

    // Bulk delete
    bulkDeleteRecipes: builder.mutation<BulkActionResponse, string[]>({
      query: (ids) => ({
        url: "/recipes/bulk-delete",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: [
        { type: "Recipes", id: "LIST" },
        { type: "Recipes", id: "ANALYTICS" },
        { type: "Recipes", id: "HISTORY" },
      ],
    }),

    // Bulk favorite
    bulkFavoriteRecipes: builder.mutation<BulkActionResponse, { ids: string[]; favorite: boolean }>(
      {
        query: ({ ids, favorite }) => ({
          url: `/recipes/bulk-favorite?favorite=${favorite}`,
          method: "POST",
          body: { ids },
        }),
        invalidatesTags: (_result, _error, { ids }) => [
          { type: "Recipes", id: "LIST" },
          { type: "Recipes", id: "ANALYTICS" },
          ...ids.map((id) => ({ type: "Recipes" as const, id })),
        ],
      }
    ),

    // ============ Analytics ============

    // Get analytics
    getRecipeAnalytics: builder.query<RecipeAnalytics, void>({
      query: () => "/recipes/analytics/overview",
      providesTags: [{ type: "Recipes", id: "ANALYTICS" }],
    }),

    // Get history
    getRecipeHistory: builder.query<RecipeHistory, number>({
      query: (months) => `/recipes/history?months=${months}`,
      providesTags: [{ type: "Recipes", id: "HISTORY" }],
    }),

    // ============ Import/Parse ============

    // Parse text
    parseRecipeText: builder.mutation<ParseRecipeResponse, ParseTextRequest>({
      query: (body) => ({
        url: "/recipes/parse-text",
        method: "POST",
        body,
      }),
    }),

    // Parse voice
    parseRecipeVoice: builder.mutation<ParseRecipeResponse, FormData>({
      query: (formData) => ({
        url: "/recipes/parse-voice",
        method: "POST",
        body: formData,
      }),
    }),

    // Parse image
    parseRecipeImage: builder.mutation<ParseRecipeResponse, FormData>({
      query: (formData) => ({
        url: "/recipes/parse-image",
        method: "POST",
        body: formData,
      }),
    }),

    // Parse URL
    parseRecipeUrl: builder.mutation<ParseRecipeResponse, ParseUrlRequest>({
      query: (body) => ({
        url: "/recipes/parse-url",
        method: "POST",
        body,
      }),
    }),

    // ============ AI Suggestions ============

    // Get AI recipe suggestions
    suggestRecipes: builder.mutation<RecipeSuggestionResponse, RecipeSuggestionRequest>({
      query: (body) => ({
        url: "/recipes/suggest",
        method: "POST",
        body,
      }),
    }),

    // ============ Nutrition Calculation ============

    // Calculate and save nutrition for a single recipe using AI
    recalculateRecipeNutrition: builder.mutation<Recipe, string>({
      query: (recipeId) => ({
        url: `/recipes/${recipeId}/calculate-nutrition`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, recipeId) => [
        { type: "Recipes", id: recipeId },
        { type: "Recipes", id: "LIST" },
      ],
    }),

    // Calculate nutrition for all recipes without nutrition data
    bulkRecalculateNutrition: builder.mutation<
      { success: boolean; processed: number; failed: number; skipped: number; total: number },
      void
    >({
      query: () => ({
        url: `/recipes/bulk/calculate-nutrition`,
        method: "POST",
      }),
      invalidatesTags: [{ type: "Recipes", id: "LIST" }],
    }),

    // ============ Shopping List Integration ============

    // Add recipe to shopping list
    addRecipeToShoppingList: builder.mutation<
      { success: boolean; message: string; ingredients_count: number; scale_factor: number },
      AddToShoppingListRequest
    >({
      query: (data) => ({
        url: `/recipes/${data.recipe_id}/add-to-shopping-list`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "ShoppingLists", id: "LIST" }],
    }),
  }),
});

export const {
  // Recipe CRUD
  useGetRecipesQuery,
  useGetRecipeQuery,
  useLazyGetRecipeQuery,
  useCreateRecipesMutation,
  useUpdateRecipeMutation,
  useUpdateRecipeIngredientsMutation,
  useDeleteRecipeMutation,
  // Scaling
  useGetScaledRecipeQuery,
  useLazyGetScaledRecipeQuery,
  // Favorites
  useToggleFavoriteMutation,
  // Cooking History
  useRecordCookingMutation,
  useGetCookingHistoryQuery,
  // Collections
  useGetCollectionsQuery,
  useGetCollectionWithRecipesQuery,
  useCreateCollectionMutation,
  useUpdateCollectionMutation,
  useDeleteCollectionMutation,
  useAddRecipesToCollectionMutation,
  useRemoveRecipesFromCollectionMutation,
  // Bulk Actions
  useBulkArchiveRecipesMutation,
  useBulkUnarchiveRecipesMutation,
  useBulkDeleteRecipesMutation,
  useBulkFavoriteRecipesMutation,
  // Analytics
  useGetRecipeAnalyticsQuery,
  useGetRecipeHistoryQuery,
  // Import/Parse
  useParseRecipeTextMutation,
  useParseRecipeVoiceMutation,
  useParseRecipeImageMutation,
  useParseRecipeUrlMutation,
  // AI Suggestions
  useSuggestRecipesMutation,
  // Nutrition Calculation
  useRecalculateRecipeNutritionMutation,
  useBulkRecalculateNutritionMutation,
  // Shopping List
  useAddRecipeToShoppingListMutation,
} = recipesApi;
