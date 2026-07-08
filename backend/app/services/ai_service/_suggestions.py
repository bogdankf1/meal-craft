"""SuggestionsMixin: AI Service for MealCraft mixins"""

from typing import Optional, List, Dict, Any
import json

class SuggestionsMixin:
    async def suggest_recipes(
        self,
        cuisine_type: Optional[str] = None,
        meal_type: Optional[str] = None,
        category: Optional[str] = None,
        servings: int = 4,
        max_prep_time: Optional[int] = None,
        max_cook_time: Optional[int] = None,
        difficulty: Optional[str] = None,
        dietary_restrictions: Optional[List[str]] = None,
        include_ingredients: Optional[List[str]] = None,
        exclude_ingredients: Optional[List[str]] = None,
        count: int = 6,
        use_only_available: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Generate AI-powered recipe suggestions based on user preferences.

        Args:
            cuisine_type: Type of cuisine (italian, mexican, etc.)
            meal_type: Type of meal (quick_easy, healthy, comfort_food, etc.)
            category: Recipe category (breakfast, lunch, dinner, etc.)
            servings: Number of servings
            max_prep_time: Maximum prep time in minutes
            max_cook_time: Maximum cook time in minutes
            difficulty: Recipe difficulty (easy, medium, hard)
            dietary_restrictions: List of dietary restrictions
            include_ingredients: Ingredients that should be included
            exclude_ingredients: Ingredients to avoid
            count: Number of suggestions to generate
            use_only_available: If True, recipes should only use the provided ingredients

        Returns:
            List of recipe suggestion dictionaries
        """
        # Build the constraints section
        constraints = []

        if cuisine_type:
            constraints.append(f"Cuisine: {cuisine_type.replace('_', ' ').title()}")

        if meal_type:
            meal_type_labels = {
                "quick_easy": "Quick & Easy (under 30 mins total)",
                "healthy": "Healthy & Nutritious",
                "comfort_food": "Comfort Food",
                "vegetarian": "Vegetarian",
                "vegan": "Vegan",
                "low_carb": "Low Carb / Keto-friendly",
                "high_protein": "High Protein",
                "budget_friendly": "Budget Friendly",
                "gourmet": "Gourmet / Special Occasion",
                "kid_friendly": "Kid Friendly",
                "one_pot": "One-Pot / One-Pan",
                "meal_prep": "Meal Prep Friendly",
                "party_food": "Party Food / Appetizers",
                "soup_stew": "Soups & Stews",
                "salad": "Salads",
                "pasta": "Pasta Dishes",
                "rice_grain": "Rice & Grain Bowls",
                "seafood": "Seafood",
                "meat": "Meat-based",
                "baked_goods": "Baked Goods & Desserts",
            }
            constraints.append(f"Style: {meal_type_labels.get(meal_type, meal_type.replace('_', ' ').title())}")

        if category:
            constraints.append(f"Category: {category.title()}")

        if max_prep_time:
            constraints.append(f"Maximum prep time: {max_prep_time} minutes")

        if max_cook_time:
            constraints.append(f"Maximum cook time: {max_cook_time} minutes")

        if difficulty:
            constraints.append(f"Difficulty level: {difficulty.title()}")

        if dietary_restrictions:
            constraints.append(f"Dietary restrictions: {', '.join(dietary_restrictions)}")

        if include_ingredients:
            if use_only_available:
                constraints.append(f"IMPORTANT: You MUST ONLY use ingredients from this list (the user's available groceries and pantry items): {', '.join(include_ingredients)}. Do not suggest recipes requiring ingredients not in this list. Basic pantry staples like salt, pepper, oil, and water are allowed.")
            else:
                constraints.append(f"Should include ingredients: {', '.join(include_ingredients)}")

        if exclude_ingredients:
            constraints.append(f"Must NOT include: {', '.join(exclude_ingredients)}")

        constraints_text = "\n".join([f"- {c}" for c in constraints]) if constraints else "- No specific constraints"

        prompt = f"""Generate {count} diverse and delicious recipe suggestions based on these criteria:

CRITERIA:
{constraints_text}

SERVINGS: {servings} people

For each recipe, provide:
1. A creative but descriptive name
2. A brief, appetizing description (2-3 sentences)
3. Prep time and cook time (be realistic)
4. Difficulty level (easy, medium, or hard)
5. Complete ingredient list with quantities and units
6. Step-by-step cooking instructions
7. Relevant tags (e.g., "gluten-free", "one-pot", "30-minute meal")
8. Estimated calories per serving
9. Any helpful tips
10. Required kitchen equipment (e.g., "Stand Mixer", "Food Processor", "Dutch Oven")
11. Cooking techniques used (e.g., "Julienne", "Blanching", "Braising")
12. Seasonal information for key ingredients (which months they're in peak season)

Return ONLY a valid JSON array with {count} recipe objects. Each object must have these exact fields:
{{
  "name": "Recipe Name",
  "description": "Brief appetizing description",
  "category": "breakfast|lunch|dinner|dessert|snack|appetizer|side|beverage|other",
  "cuisine_type": "cuisine name",
  "prep_time": 15,
  "cook_time": 30,
  "servings": {servings},
  "difficulty": "easy|medium|hard",
  "instructions": "Step 1: ... Step 2: ... (complete instructions)",
  "ingredients": [
    {{"ingredient_name": "ingredient", "quantity": 2.0, "unit": "cups", "category": "produce|meat|dairy|pantry|other"}}
  ],
  "tags": ["tag1", "tag2"],
  "dietary_info": ["vegetarian", "gluten-free"],
  "estimated_calories": 350,
  "tips": "Helpful cooking tip",
  "required_equipment": [
    {{"equipment_name": "Stand Mixer", "category": "appliances", "is_required": true, "substitute_note": "Can use hand mixer"}}
  ],
  "techniques": [
    {{"skill_name": "Julienne", "category": "knife_skills", "difficulty": "intermediate", "description": "Cut into thin matchstick strips"}}
  ],
  "seasonal_info": [
    {{"ingredient_name": "tomatoes", "peak_months": [6, 7, 8], "substitute_out_of_season": "canned tomatoes"}}
  ],
  "best_season_months": [6, 7, 8]
}}

Notes for integration fields:
- required_equipment: List kitchen tools needed. Categories: cookware, bakeware, appliances, knives_cutting, utensils, small_tools, specialty
- techniques: List cooking techniques used. Categories: knife_skills, cooking_methods, baking, preparation. Difficulty: beginner, intermediate, advanced
- seasonal_info: Only include for 1-3 key seasonal ingredients. Peak months are 1-12 (January=1, December=12)
- best_season_months: Overall best months to make this recipe based on ingredient seasonality

Make the recipes varied, interesting, and practical. Use common ingredients when possible.

JSON array:"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": """You are a professional chef and recipe developer with expertise in world cuisines.
You create delicious, practical recipes that home cooks can easily follow.
Your recipes are well-balanced, flavorful, and include accurate measurements and cooking times.
Always return valid JSON with no markdown formatting.""",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.8,  # Higher creativity for varied suggestions
                max_tokens=8000,  # Recipes need more tokens
            )

            result_text = response.choices[0].message.content.strip()
            print(f"[AI Service] Recipe suggestions raw response length: {len(result_text)}")

            # Clean up markdown code blocks
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]
                result_text = result_text.strip()

            # Also handle trailing ```
            if result_text.endswith("```"):
                result_text = result_text[:-3].strip()

            recipes = json.loads(result_text)

            if not isinstance(recipes, list):
                recipes = [recipes]

            print(f"[AI Service] Generated {len(recipes)} recipe suggestions")
            return recipes

        except json.JSONDecodeError as e:
            print(f"[AI Service] JSON parsing error in recipe suggestions: {e}")
            print(f"[AI Service] Raw text: {result_text[:500]}...")
            return []
        except Exception as e:
            print(f"[AI Service] Error generating recipe suggestions: {e}")
            import traceback
            print(f"[AI Service] Traceback: {traceback.format_exc()}")
            return []
