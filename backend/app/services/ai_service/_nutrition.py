"""NutritionMixin: AI Service for MealCraft mixins"""

from typing import List, Dict, Any
import json

class NutritionMixin:
    async def calculate_recipe_nutrition(
        self,
        recipe_name: str,
        ingredients: List[Dict[str, Any]],
        servings: int = 1,
    ) -> Dict[str, Any]:
        """
        Calculate nutritional values for a recipe based on its ingredients.

        Args:
            recipe_name: Name of the recipe
            ingredients: List of ingredients with name, quantity, unit
            servings: Number of servings the recipe makes

        Returns:
            Dictionary with nutrition values per serving
        """
        if not ingredients:
            return {}

        # Format ingredients for the prompt
        ingredient_list = []
        for ing in ingredients:
            name = ing.get("ingredient_name", ing.get("name", ""))
            qty = ing.get("quantity", "")
            unit = ing.get("unit", "")
            if qty and unit:
                ingredient_list.append(f"- {qty} {unit} {name}")
            elif qty:
                ingredient_list.append(f"- {qty} {name}")
            else:
                ingredient_list.append(f"- {name}")

        ingredients_text = "\n".join(ingredient_list)

        prompt = f"""Calculate the nutritional values for this recipe.

RECIPE: {recipe_name}
SERVINGS: {servings}

INGREDIENTS:
{ingredients_text}

Calculate the TOTAL nutrition for all ingredients combined, then divide by {servings} to get PER SERVING values.

Return ONLY a valid JSON object with these exact fields (all values should be per serving):
- calories (integer, kcal)
- protein_g (number, grams of protein)
- carbs_g (number, grams of carbohydrates)
- fat_g (number, grams of fat)
- fiber_g (number, grams of fiber)
- sugar_g (number, grams of sugar)
- sodium_mg (number, milligrams of sodium)

If you cannot estimate a value, use null. Be realistic with estimates based on common nutritional databases.

JSON object:"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a nutrition expert. Calculate accurate nutritional values based on ingredients. Use standard nutritional databases as reference (USDA, etc.). Always return valid JSON.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                max_tokens=500,
            )

            result_text = response.choices[0].message.content.strip()
            print(f"[AI Service] Recipe nutrition response: {result_text}")

            # Clean up markdown code blocks
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]
                result_text = result_text.strip()

            nutrition = json.loads(result_text)
            print(f"[AI Service] Calculated nutrition for '{recipe_name}': {nutrition}")
            return nutrition

        except json.JSONDecodeError as e:
            print(f"[AI Service] JSON parsing error: {e}")
            return {}
        except Exception as e:
            print(f"[AI Service] Error calculating recipe nutrition: {e}")
            import traceback
            print(f"[AI Service] Traceback: {traceback.format_exc()}")
            return {}

    async def estimate_restaurant_meal_nutrition(
        self,
        restaurant_name: str,
        items_ordered: List[str],
        meal_type: str = "lunch",
    ) -> Dict[str, Any]:
        """
        Estimate nutritional values for a restaurant meal.

        Args:
            restaurant_name: Name of the restaurant
            items_ordered: List of items/dishes ordered
            meal_type: Type of meal (breakfast, lunch, dinner, snack)

        Returns:
            Dictionary with estimated nutrition values
        """
        if not items_ordered:
            return {}

        items_text = "\n".join([f"- {item}" for item in items_ordered])

        prompt = f"""Estimate the nutritional values for this restaurant meal.

RESTAURANT: {restaurant_name}
MEAL TYPE: {meal_type}

ITEMS ORDERED:
{items_text}

Estimate the TOTAL nutrition for all items combined (as one meal).

Consider:
1. Typical portion sizes at {restaurant_name} (or similar restaurants if specific data unavailable)
2. Common preparation methods (fried, grilled, etc.)
3. Standard nutritional values for these dishes

Return ONLY a valid JSON object with these exact fields:
- calories (integer, kcal)
- protein_g (number, grams of protein)
- carbs_g (number, grams of carbohydrates)
- fat_g (number, grams of fat)
- fiber_g (number, grams of fiber)
- sugar_g (number, grams of sugar)
- sodium_mg (number, milligrams of sodium)

If you cannot estimate a value, use null. Be realistic - restaurant meals often have more calories, sodium, and fat than home cooking.

JSON object:"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a nutrition expert specializing in restaurant meal analysis. Estimate nutritional values based on typical restaurant portions and preparation methods. Always return valid JSON.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=500,
            )

            result_text = response.choices[0].message.content.strip()
            print(f"[AI Service] Restaurant nutrition response: {result_text}")

            # Clean up markdown code blocks
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]
                result_text = result_text.strip()

            nutrition = json.loads(result_text)
            print(f"[AI Service] Estimated nutrition for '{restaurant_name}': {nutrition}")
            return nutrition

        except json.JSONDecodeError as e:
            print(f"[AI Service] JSON parsing error: {e}")
            return {}
        except Exception as e:
            print(f"[AI Service] Error estimating restaurant nutrition: {e}")
            import traceback
            print(f"[AI Service] Traceback: {traceback.format_exc()}")
            return {}

    async def estimate_food_nutrition(
        self,
        food_description: str,
    ) -> Dict[str, Any]:
        """
        Estimate nutritional values for a food item based on description.

        Args:
            food_description: Description of the food (e.g., "large apple", "protein shake")

        Returns:
            Dictionary with estimated nutrition values
        """
        if not food_description:
            return {}

        prompt = f"""Estimate the nutritional values for this food item.

FOOD: {food_description}

Return ONLY a valid JSON object with these exact fields:
- name (string, cleaned up name of the food)
- calories (integer, kcal)
- protein_g (number, grams of protein)
- carbs_g (number, grams of carbohydrates)
- fat_g (number, grams of fat)
- fiber_g (number, grams of fiber)
- sugar_g (number, grams of sugar)
- sodium_mg (number, milligrams of sodium)

If you cannot estimate a value, use null.

JSON object:"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a nutrition expert. Estimate nutritional values based on standard food databases. Always return valid JSON.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                max_tokens=500,
            )

            result_text = response.choices[0].message.content.strip()

            # Clean up markdown code blocks
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]
                result_text = result_text.strip()

            nutrition = json.loads(result_text)
            print(f"[AI Service] Estimated nutrition for '{food_description}': {nutrition}")
            return nutrition

        except json.JSONDecodeError as e:
            print(f"[AI Service] JSON parsing error: {e}")
            return {}
        except Exception as e:
            print(f"[AI Service] Error estimating food nutrition: {e}")
            return {}
