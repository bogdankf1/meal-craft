"""RecipeMixin: AI Service for MealCraft mixins"""

from typing import Optional, List, Dict, Any
import json
import re
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

class RecipeMixin:
    RECIPE_CATEGORIES = ["breakfast", "lunch", "dinner", "dessert", "snack", "appetizer", "side", "beverage", "other"]
    RECIPE_DIFFICULTIES = ["easy", "medium", "hard"]

    async def parse_recipe_text(
        self,
        text: str,
        default_category: Optional[str] = None,
        default_servings: int = 4,
        db: Optional[AsyncSession] = None,
        user_id: Optional[UUID] = None,
    ) -> List[Dict[str, Any]]:
        """
        Parse free-form text into structured recipe(s) using AI

        Args:
            text: Free-form text containing recipe information
            default_category: Default category to use if not detected
            default_servings: Default servings if not detected
            db: Database session (optional)
            user_id: User ID (optional)

        Returns:
            List of parsed recipes in RecipeCreate format
        """
        prompt = f"""You are a recipe parser. Parse the following text into structured recipe(s).

TEXT TO PARSE:
{text}

VALID CATEGORIES:
{', '.join(self.RECIPE_CATEGORIES)}

VALID DIFFICULTIES:
{', '.join(self.RECIPE_DIFFICULTIES)}

RULES:
1. Extract recipe name, ingredients, and instructions
2. IMPORTANT: For ingredients, extract EACH ingredient separately with quantity and unit
3. Try to identify:
   - Recipe name
   - Description (brief summary)
   - Category (from valid categories, default: "{default_category or 'other'}")
   - Cuisine type (Italian, Mexican, Asian, etc.)
   - Prep time in minutes
   - Cook time in minutes
   - Servings (default: {default_servings})
   - Difficulty (easy, medium, hard)
   - Instructions (as plain text)
   - Source (if mentioned, like "Grandma's recipe", "from food blog", etc.)
   - Any dietary info (vegetarian, vegan, gluten-free, etc.)
   - Tags (quick, healthy, comfort food, etc.)
4. For ingredients, extract:
   - ingredient_name: the actual ingredient
   - quantity: numeric amount (or null)
   - unit: measurement unit (cups, tbsp, kg, g, pieces, etc.)
   - category: ingredient category (produce, dairy, meat, pantry, etc.)
5. Parse text in Ukrainian/Russian as well
6. If the text describes multiple recipes, return all of them
7. This text may come from voice transcription - ignore filler words

Return ONLY a valid JSON array of recipe objects with these exact fields:
- name (string, required) - recipe name
- description (string or null)
- category (string from valid categories or null)
- cuisine_type (string or null) - e.g., "Italian", "Mexican"
- dietary_restrictions (array of strings or null) - e.g., ["vegetarian", "gluten-free"]
- tags (array of strings or null) - e.g., ["quick", "healthy"]
- prep_time (number in minutes or null)
- cook_time (number in minutes or null)
- servings (number, default {default_servings})
- difficulty (string from valid difficulties or null)
- instructions (string, required) - cooking instructions as text
- source (string or null) - where the recipe came from
- notes (string or null) - any additional notes
- ingredients (array of objects, required) - each with:
  - ingredient_name (string, required)
  - quantity (number or null)
  - unit (string or null)
  - category (string or null)

Example output for "Chicken pasta with garlic. Cook pasta. Fry chicken with garlic. Mix together.":
[{{
  "name": "Chicken Pasta with Garlic",
  "description": "Simple pasta dish with chicken and garlic",
  "category": "dinner",
  "cuisine_type": "Italian",
  "dietary_restrictions": null,
  "tags": ["quick", "easy"],
  "prep_time": 10,
  "cook_time": 20,
  "servings": 4,
  "difficulty": "easy",
  "instructions": "1. Cook pasta according to package directions.\\n2. While pasta cooks, dice chicken into bite-sized pieces.\\n3. Heat oil in a large skillet over medium-high heat.\\n4. Cook chicken until golden and cooked through, about 5-7 minutes.\\n5. Add minced garlic and sauté for 30 seconds.\\n6. Drain pasta and add to skillet.\\n7. Toss everything together and serve.",
  "source": null,
  "notes": null,
  "ingredients": [
    {{"ingredient_name": "pasta", "quantity": 400, "unit": "g", "category": "pantry"}},
    {{"ingredient_name": "chicken breast", "quantity": 500, "unit": "g", "category": "meat"}},
    {{"ingredient_name": "garlic", "quantity": 3, "unit": "cloves", "category": "produce"}},
    {{"ingredient_name": "olive oil", "quantity": 2, "unit": "tbsp", "category": "pantry"}}
  ]
}}]

JSON array:"""

        try:
            print(f"[AI Service] Parsing recipe text: {text[:100]}...")
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a precise recipe parser. Always return valid JSON arrays with complete recipe information. Extract ingredients with proper quantities and units.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=4000,
            )

            result_text = response.choices[0].message.content.strip()
            print(f"[AI Service] Raw response: {result_text[:500]}...")

            # Clean up markdown code blocks
            if result_text.startswith("```"):
                result_text = re.sub(r'^```json?\s*', '', result_text)
                result_text = re.sub(r'\s*```$', '', result_text)

            parsed_recipes = json.loads(result_text)

            # Validate and convert to RecipeCreate format
            from app.schemas.recipe import RecipeCreate, RecipeIngredientCreate, RecipeCategory, RecipeDifficulty

            validated_recipes = []
            for recipe in parsed_recipes:
                if not recipe.get("name") or not recipe.get("instructions"):
                    continue

                # Validate category
                category = recipe.get("category")
                if category and category not in self.RECIPE_CATEGORIES:
                    category = default_category or "other"

                # Validate difficulty
                difficulty = recipe.get("difficulty")
                if difficulty and difficulty not in self.RECIPE_DIFFICULTIES:
                    difficulty = None

                # Parse ingredients
                ingredients = []
                for ing in recipe.get("ingredients", []):
                    if not ing.get("ingredient_name"):
                        continue
                    ingredients.append(RecipeIngredientCreate(
                        ingredient_name=str(ing.get("ingredient_name", "")).strip(),
                        quantity=float(ing["quantity"]) if ing.get("quantity") is not None else None,
                        unit=str(ing["unit"]).lower() if ing.get("unit") else None,
                        category=ing.get("category"),
                    ))

                if not ingredients:
                    # Try to create a basic ingredient list from text
                    ingredients.append(RecipeIngredientCreate(
                        ingredient_name="See instructions",
                        quantity=None,
                        unit=None,
                        category=None,
                    ))

                validated_recipes.append(RecipeCreate(
                    name=str(recipe.get("name", "")).strip(),
                    description=recipe.get("description"),
                    category=RecipeCategory(category) if category else None,
                    cuisine_type=recipe.get("cuisine_type"),
                    dietary_restrictions=recipe.get("dietary_restrictions"),
                    tags=recipe.get("tags"),
                    prep_time=int(recipe["prep_time"]) if recipe.get("prep_time") else None,
                    cook_time=int(recipe["cook_time"]) if recipe.get("cook_time") else None,
                    servings=int(recipe.get("servings", default_servings)),
                    difficulty=RecipeDifficulty(difficulty) if difficulty else None,
                    instructions=str(recipe.get("instructions", "")).strip(),
                    source=recipe.get("source"),
                    notes=recipe.get("notes"),
                    ingredients=ingredients,
                ))

            print(f"[AI Service] Parsed {len(validated_recipes)} recipes from text")
            return validated_recipes

        except json.JSONDecodeError as e:
            print(f"[AI Service] JSON parsing error: {e}")
            print(f"[AI Service] Raw response: {result_text}")
            return []
        except Exception as e:
            print(f"[AI Service] Error parsing recipe text: {e}")
            import traceback
            print(f"[AI Service] Traceback: {traceback.format_exc()}")
            raise

    async def parse_recipe_voice(
        self,
        audio_content: bytes,
        filename: str,
        language: str = "auto",
        default_category: Optional[str] = None,
        default_servings: int = 4,
        db: Optional[AsyncSession] = None,
        user_id: Optional[UUID] = None,
    ) -> List[Dict[str, Any]]:
        """
        Transcribe voice recording and parse recipe(s)

        Args:
            audio_content: Audio file bytes
            filename: Original filename
            language: Language code or "auto"
            default_category: Default category
            default_servings: Default servings
            db: Database session
            user_id: User ID

        Returns:
            List of parsed recipes
        """
        import io

        # Create file-like object for Whisper
        audio_file = io.BytesIO(audio_content)
        audio_file.name = filename

        # Transcribe with Whisper
        transcription = self.client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language=None if language == "auto" else language,
        )

        transcribed_text = transcription.text
        print(f"[AI Service] Recipe voice transcription: {transcribed_text}")

        if not transcribed_text or len(transcribed_text.strip()) < 3:
            return []

        # Parse the transcribed text
        return await self.parse_recipe_text(
            text=transcribed_text,
            default_category=default_category,
            default_servings=default_servings,
            db=db,
            user_id=user_id,
        )

    async def parse_recipe_images(
        self,
        images: List[Dict[str, Any]],
        import_type: str = "recipe",
        default_category: Optional[str] = None,
        default_servings: int = 4,
        db: Optional[AsyncSession] = None,
        user_id: Optional[UUID] = None,
    ) -> List[Dict[str, Any]]:
        """
        Parse recipe from one or more images using GPT-4o vision

        Args:
            images: List of image data dicts with 'content' and 'filename' keys
            import_type: Type of import (recipe, screenshot)
            default_category: Default category
            default_servings: Default servings
            db: Database session
            user_id: User ID

        Returns:
            List of parsed recipes
        """
        import base64

        print(f"[AI Service] Parsing {len(images)} recipe images of type: {import_type}")

        # Prepare image content for API
        image_contents = []
        for i, image_data in enumerate(images):
            content = image_data["content"]
            base64_image = base64.b64encode(content).decode('utf-8')

            # Detect image type
            image_type = "image/jpeg"
            if content[:3] == b'\xff\xd8\xff':
                image_type = "image/jpeg"
            elif content[:4] == b'\x89PNG':
                image_type = "image/png"
            elif content[:4] == b'RIFF':
                image_type = "image/webp"

            image_contents.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{image_type};base64,{base64_image}",
                    "detail": "high"
                }
            })

        # Build context-specific prompt
        context_instructions = {
            "recipe": "This is a photo of a handwritten or printed recipe. Extract the recipe information.",
            "screenshot": "This is a screenshot of a recipe from an app or website. Extract the recipe information.",
        }

        context = context_instructions.get(import_type, context_instructions["recipe"])

        prompt = f"""You are a recipe parser with vision capabilities.

CONTEXT: {context}

{"IMPORTANT: These are MULTIPLE images of the same recipe. Combine all information into ONE complete recipe." if len(images) > 1 else ""}

VALID CATEGORIES:
{', '.join(self.RECIPE_CATEGORIES)}

VALID DIFFICULTIES:
{', '.join(self.RECIPE_DIFFICULTIES)}

RULES:
1. Extract the complete recipe from the image(s)
2. For handwritten recipes, read carefully and interpret the handwriting
3. For each ingredient, extract:
   - ingredient_name: the actual ingredient
   - quantity: numeric amount
   - unit: measurement unit
   - category: ingredient category
4. Extract cooking instructions step by step
5. Try to identify prep time, cook time, servings, difficulty
6. Parse text in any language (English, Ukrainian, Russian, etc.)

Return ONLY a valid JSON array of recipe objects with these exact fields:
- name (string, required)
- description (string or null)
- category (string from valid categories or null)
- cuisine_type (string or null)
- dietary_restrictions (array of strings or null)
- tags (array of strings or null)
- prep_time (number in minutes or null)
- cook_time (number in minutes or null)
- servings (number, default {default_servings})
- difficulty (string from valid difficulties or null)
- instructions (string, required)
- source (string or null)
- notes (string or null)
- ingredients (array of objects, required) - each with:
  - ingredient_name (string, required)
  - quantity (number or null)
  - unit (string or null)
  - category (string or null)

JSON array:"""

        try:
            messages = [
                {
                    "role": "system",
                    "content": "You are a precise recipe parser with vision capabilities. Extract complete recipe information from images including handwritten text. Return valid JSON."
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        *image_contents
                    ]
                }
            ]

            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                temperature=0.3,
                max_tokens=4000,
            )

            result_text = response.choices[0].message.content.strip()
            print(f"[AI Service] GPT-4o response: {result_text[:500]}...")

            # Clean up markdown code blocks
            if result_text.startswith("```"):
                result_text = re.sub(r'^```json?\s*', '', result_text)
                result_text = re.sub(r'\s*```$', '', result_text)

            parsed_recipes = json.loads(result_text)

            # Validate and convert to RecipeCreate format
            from app.schemas.recipe import RecipeCreate, RecipeIngredientCreate, RecipeCategory, RecipeDifficulty

            validated_recipes = []
            for recipe in parsed_recipes:
                if not recipe.get("name") or not recipe.get("instructions"):
                    continue

                # Validate category
                category = recipe.get("category")
                if category and category not in self.RECIPE_CATEGORIES:
                    category = default_category or "other"

                # Validate difficulty
                difficulty = recipe.get("difficulty")
                if difficulty and difficulty not in self.RECIPE_DIFFICULTIES:
                    difficulty = None

                # Parse ingredients
                ingredients = []
                for ing in recipe.get("ingredients", []):
                    if not ing.get("ingredient_name"):
                        continue
                    ingredients.append(RecipeIngredientCreate(
                        ingredient_name=str(ing.get("ingredient_name", "")).strip(),
                        quantity=float(ing["quantity"]) if ing.get("quantity") is not None else None,
                        unit=str(ing["unit"]).lower() if ing.get("unit") else None,
                        category=ing.get("category"),
                    ))

                if not ingredients:
                    ingredients.append(RecipeIngredientCreate(
                        ingredient_name="See instructions",
                        quantity=None,
                        unit=None,
                        category=None,
                    ))

                validated_recipes.append(RecipeCreate(
                    name=str(recipe.get("name", "")).strip(),
                    description=recipe.get("description"),
                    category=RecipeCategory(category) if category else None,
                    cuisine_type=recipe.get("cuisine_type"),
                    dietary_restrictions=recipe.get("dietary_restrictions"),
                    tags=recipe.get("tags"),
                    prep_time=int(recipe["prep_time"]) if recipe.get("prep_time") else None,
                    cook_time=int(recipe["cook_time"]) if recipe.get("cook_time") else None,
                    servings=int(recipe.get("servings", default_servings)),
                    difficulty=RecipeDifficulty(difficulty) if difficulty else None,
                    instructions=str(recipe.get("instructions", "")).strip(),
                    source=recipe.get("source"),
                    notes=recipe.get("notes"),
                    ingredients=ingredients,
                ))

            print(f"[AI Service] Parsed {len(validated_recipes)} recipes from {len(images)} image(s)")
            return validated_recipes

        except json.JSONDecodeError as e:
            print(f"[AI Service] JSON parsing error: {e}")
            print(f"[AI Service] Raw response: {result_text}")
            return []
        except Exception as e:
            print(f"[AI Service] Error parsing recipe images: {e}")
            import traceback
            print(f"[AI Service] Traceback: {traceback.format_exc()}")
            raise

    async def parse_recipe_url(
        self,
        url: str,
        db: Optional[AsyncSession] = None,
        user_id: Optional[UUID] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetch a recipe from URL and parse it using AI

        Args:
            url: URL of the recipe page
            db: Database session (optional)
            user_id: User ID (optional)

        Returns:
            List of parsed recipes
        """
        import httpx
        from bs4 import BeautifulSoup

        print(f"[AI Service] Parsing recipe from URL: {url}")

        try:
            # Fetch the recipe page
            async with httpx.AsyncClient(
                follow_redirects=True,
                timeout=30.0,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9,uk;q=0.8",
                }
            ) as client:
                response = await client.get(url)
                response.raise_for_status()

            html_content = response.text
            print(f"[AI Service] Fetched {len(html_content)} bytes of HTML")

            # Parse HTML and extract text content
            soup = BeautifulSoup(html_content, 'html.parser')

            # Remove script and style elements
            for element in soup(["script", "style", "nav", "footer", "header", "aside", "iframe"]):
                element.decompose()

            # Try to find recipe schema.org data
            schema_data = None
            for script in soup.find_all("script", {"type": "application/ld+json"}):
                try:
                    data = json.loads(script.string)
                    if isinstance(data, list):
                        for item in data:
                            if item.get("@type") == "Recipe":
                                schema_data = item
                                break
                    elif data.get("@type") == "Recipe":
                        schema_data = data
                except:
                    pass

            # Get text content
            text_content = soup.get_text(separator='\n', strip=True)

            # Limit text length for API
            if len(text_content) > 15000:
                text_content = text_content[:15000]

            print(f"[AI Service] Extracted {len(text_content)} chars of text from recipe page")

            # Build prompt
            prompt = f"""You are a recipe parser. Parse the following recipe content into structured format.

{"SCHEMA DATA (structured data found on page):" + json.dumps(schema_data, indent=2)[:3000] if schema_data else ""}

PAGE TEXT CONTENT:
{text_content}

SOURCE URL: {url}

VALID CATEGORIES:
{', '.join(self.RECIPE_CATEGORIES)}

VALID DIFFICULTIES:
{', '.join(self.RECIPE_DIFFICULTIES)}

RULES:
1. Extract the complete recipe from the page content
2. If schema data is available, use it as the primary source but supplement with page text
3. For EACH ingredient, extract:
   - ingredient_name: just the ingredient name
   - quantity: numeric amount
   - unit: measurement unit (cups, tbsp, g, etc.)
   - category: ingredient category (produce, meat, dairy, pantry, etc.)
4. Extract cooking instructions step by step
5. Include the source URL
6. Parse text in any language

Return ONLY a valid JSON array with ONE recipe object with these exact fields:
- name (string, required)
- description (string or null)
- category (string from valid categories or null)
- cuisine_type (string or null)
- dietary_restrictions (array of strings or null)
- tags (array of strings or null)
- prep_time (number in minutes or null)
- cook_time (number in minutes or null)
- servings (number, default 4)
- difficulty (string from valid difficulties or null)
- instructions (string, required) - full cooking instructions
- source (string) - website name
- source_url (string) - the URL
- notes (string or null)
- ingredients (array of objects, required) - each with:
  - ingredient_name (string, required)
  - quantity (number or null)
  - unit (string or null)
  - category (string or null)

JSON array:"""

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a precise recipe parser. Extract complete recipe information from web pages. Return valid JSON with detailed ingredient lists.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=4000,
            )

            result_text = response.choices[0].message.content.strip()
            print(f"[AI Service] GPT response: {result_text[:500]}...")

            # Clean up markdown code blocks
            if result_text.startswith("```"):
                result_text = re.sub(r'^```json?\s*', '', result_text)
                result_text = re.sub(r'\s*```$', '', result_text)

            parsed_recipes = json.loads(result_text)

            # Validate and convert to RecipeCreate format
            from app.schemas.recipe import RecipeCreate, RecipeIngredientCreate, RecipeCategory, RecipeDifficulty

            validated_recipes = []
            for recipe in parsed_recipes:
                if not recipe.get("name") or not recipe.get("instructions"):
                    continue

                # Validate category
                category = recipe.get("category")
                if category and category not in self.RECIPE_CATEGORIES:
                    category = "other"

                # Validate difficulty
                difficulty = recipe.get("difficulty")
                if difficulty and difficulty not in self.RECIPE_DIFFICULTIES:
                    difficulty = None

                # Parse ingredients
                ingredients = []
                for ing in recipe.get("ingredients", []):
                    if not ing.get("ingredient_name"):
                        continue
                    ingredients.append(RecipeIngredientCreate(
                        ingredient_name=str(ing.get("ingredient_name", "")).strip(),
                        quantity=float(ing["quantity"]) if ing.get("quantity") is not None else None,
                        unit=str(ing["unit"]).lower() if ing.get("unit") else None,
                        category=ing.get("category"),
                    ))

                if not ingredients:
                    ingredients.append(RecipeIngredientCreate(
                        ingredient_name="See instructions",
                        quantity=None,
                        unit=None,
                        category=None,
                    ))

                validated_recipes.append(RecipeCreate(
                    name=str(recipe.get("name", "")).strip(),
                    description=recipe.get("description"),
                    category=RecipeCategory(category) if category else None,
                    cuisine_type=recipe.get("cuisine_type"),
                    dietary_restrictions=recipe.get("dietary_restrictions"),
                    tags=recipe.get("tags"),
                    prep_time=int(recipe["prep_time"]) if recipe.get("prep_time") else None,
                    cook_time=int(recipe["cook_time"]) if recipe.get("cook_time") else None,
                    servings=int(recipe.get("servings", 4)),
                    difficulty=RecipeDifficulty(difficulty) if difficulty else None,
                    instructions=str(recipe.get("instructions", "")).strip(),
                    source=recipe.get("source"),
                    source_url=url,
                    notes=recipe.get("notes"),
                    ingredients=ingredients,
                ))

            print(f"[AI Service] Parsed {len(validated_recipes)} recipes from URL")
            return validated_recipes

        except httpx.HTTPError as e:
            print(f"[AI Service] HTTP error fetching recipe: {e}")
            raise ValueError(f"Could not fetch recipe: {str(e)}")
        except json.JSONDecodeError as e:
            print(f"[AI Service] JSON parsing error: {e}")
            print(f"[AI Service] Raw response: {result_text}")
            return []
        except Exception as e:
            print(f"[AI Service] Error parsing recipe URL: {e}")
            import traceback
            print(f"[AI Service] Traceback: {traceback.format_exc()}")
            raise


    # ============ Restaurant Meal Parsing Methods ============
