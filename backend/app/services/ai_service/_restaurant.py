"""RestaurantMixin: AI Service for MealCraft mixins"""

from typing import Optional, List, Dict, Any
import json
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

class RestaurantMixin:
    async def transcribe_and_parse_restaurant_meals(
        self,
        audio_file,
        language: str = "auto",
        default_date: Optional[date] = None,
        db: Optional[AsyncSession] = None,
        user_id: Optional[UUID] = None,
    ) -> tuple[List[Dict[str, Any]], str]:
        """
        Transcribe audio and parse into restaurant meal entries

        Args:
            audio_file: Audio file object
            language: Language code or "auto"
            default_date: Default date for meals
            db: Database session
            user_id: User ID

        Returns:
            Tuple of (list of parsed restaurant meals, transcribed text)
        """
        from datetime import date as date_type
        meal_date = default_date or date_type.today()

        # First transcribe
        transcribed_text = await self.transcribe_audio(audio_file, language)
        print(f"[AI Service] Restaurant meal transcribed text: '{transcribed_text}'")

        if not transcribed_text or len(transcribed_text.strip()) < 3:
            print("[AI Service] Transcription too short or empty")
            return [], transcribed_text or ""

        # Then parse the transcribed text
        result = await self.parse_restaurant_meal_text(transcribed_text, meal_date)
        print(f"[AI Service] Parsed {len(result)} restaurant meals from voice")
        return result, transcribed_text

    async def parse_restaurant_meal_text(
        self,
        text: str,
        default_date: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        """
        Parse text into restaurant meal entries using AI

        Args:
            text: Text to parse
            default_date: Default date for meals

        Returns:
            List of parsed restaurant meal dictionaries
        """
        from datetime import date as date_type
        meal_date = default_date or date_type.today()

        if not text or len(text.strip()) < 3:
            return []

        prompt = f"""You are a restaurant meal parser. Parse the following text into structured restaurant meal entries.

TEXT:
{text}

VALID MEAL TYPES: breakfast, lunch, dinner, snack
VALID ORDER TYPES: dine_in, delivery, takeout

RULES:
1. Extract restaurant name, items ordered, and any other details
2. Default date if not mentioned: {meal_date.isoformat()}
3. Detect meal type from time of day or explicit mentions:
   - Morning/завтрак/сніданок = breakfast
   - Midday/обід/обед = lunch
   - Evening/вечеря/ужин = dinner
   - Otherwise default to "lunch"
4. Detect order type from mentions:
   - delivery/доставка = delivery
   - takeout/takeaway/на виніс/самовивіз = takeout
   - dine-in/в залі/в ресторане = dine_in
   - Default to "dine_in"
5. Extract items ordered as a list of strings
6. Each line/entry should be a separate meal if multiple restaurants mentioned

Return ONLY a valid JSON array of objects with these exact fields:
- restaurant_name (string, required)
- meal_date (string in YYYY-MM-DD format)
- meal_type (string: breakfast, lunch, dinner, snack)
- order_type (string: dine_in, delivery, takeout)
- items_ordered (array of strings or null)
- notes (string or null)
- rating (number 1-5 or null)

JSON array:"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a precise restaurant meal parser. Always return valid JSON arrays. Parse restaurant names, items ordered, meal types, and order types from the text.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=2000,
            )

            result_text = response.choices[0].message.content.strip()
            print(f"[AI Service] Restaurant meal GPT response: {result_text[:500]}...")

            # Clean up markdown code blocks
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]
                result_text = result_text.strip()

            parsed_items = json.loads(result_text)

            if not isinstance(parsed_items, list):
                parsed_items = [parsed_items]

            return parsed_items

        except json.JSONDecodeError as e:
            print(f"[AI Service] JSON parsing error: {e}")
            return []
        except Exception as e:
            print(f"[AI Service] Error parsing restaurant meal text: {e}")
            import traceback
            print(f"[AI Service] Traceback: {traceback.format_exc()}")
            return []

    async def parse_restaurant_meal_images(
        self,
        images: List[bytes],
        import_type: str = "food",
        default_date: Optional[date] = None,
        db: Optional[AsyncSession] = None,
        user_id: Optional[UUID] = None,
    ) -> List[Dict[str, Any]]:
        """
        Parse restaurant meal information from images using AI vision

        Args:
            images: List of image bytes
            import_type: Type of image (food, receipt, app_screenshot)
            default_date: Default date for meals
            db: Database session
            user_id: User ID

        Returns:
            List of parsed restaurant meal dictionaries
        """
        import base64
        from datetime import date as date_type
        meal_date = default_date or date_type.today()

        if not images:
            return []

        print(f"[AI Service] Parsing {len(images)} restaurant meal image(s), type: {import_type}")

        # Build the prompt based on import type
        if import_type == "food":
            system_prompt = "You are a food recognition expert. Analyze photos of restaurant meals and identify the dishes, restaurant (if visible), and any other details."
            user_prompt = f"""Analyze this food photo and extract restaurant meal information.

Look for:
1. Identify the dishes/food items in the image
2. If restaurant name is visible (on packaging, receipts, napkins), extract it
3. Estimate the meal type based on the food (breakfast items, lunch, dinner, snack)
4. If delivery packaging is visible, set order_type to "delivery"

Default date: {meal_date.isoformat()}

Return ONLY a valid JSON array with objects containing:
- restaurant_name (string - use "Unknown Restaurant" if not visible)
- meal_date (string YYYY-MM-DD)
- meal_type (string: breakfast, lunch, dinner, snack)
- order_type (string: dine_in, delivery, takeout)
- items_ordered (array of strings - food items visible in image)
- notes (string or null - any additional observations)

JSON array:"""

        elif import_type == "receipt":
            system_prompt = "You are a receipt parser specializing in restaurant receipts. Extract all relevant information from restaurant receipts."
            user_prompt = f"""Parse this restaurant receipt image.

Extract:
1. Restaurant name
2. Items ordered with names
3. Date if visible (otherwise use {meal_date.isoformat()})
4. Order type (dine-in, takeout, delivery) if indicated
5. Any other relevant details

Return ONLY a valid JSON array with objects containing:
- restaurant_name (string, required)
- meal_date (string YYYY-MM-DD)
- meal_type (string: breakfast, lunch, dinner, snack - estimate from time or items)
- order_type (string: dine_in, delivery, takeout)
- items_ordered (array of strings - each item from receipt)
- notes (string or null)

JSON array:"""

        else:  # app_screenshot
            system_prompt = "You are an expert at parsing food delivery app screenshots (Uber Eats, DoorDash, Glovo, Bolt Food, etc.). Extract order details from these screenshots."
            user_prompt = f"""Parse this food delivery app screenshot.

Extract:
1. Restaurant name
2. All ordered items
3. Order date if visible (otherwise use {meal_date.isoformat()})
4. This is a delivery order

Return ONLY a valid JSON array with objects containing:
- restaurant_name (string, required)
- meal_date (string YYYY-MM-DD)
- meal_type (string: breakfast, lunch, dinner, snack - estimate from items)
- order_type (string: "delivery" for app orders)
- items_ordered (array of strings - each item ordered)
- notes (string or null)

JSON array:"""

        # Build message content with images
        content = [{"type": "text", "text": user_prompt}]

        for img_data in images:
            base64_image = base64.b64encode(img_data).decode("utf-8")
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{base64_image}",
                    "detail": "high"
                }
            })

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": content},
                ],
                temperature=0.3,
                max_tokens=2000,
            )

            result_text = response.choices[0].message.content.strip()
            print(f"[AI Service] Restaurant meal image GPT response: {result_text[:500]}...")

            # Clean up markdown code blocks
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]
                result_text = result_text.strip()

            parsed_items = json.loads(result_text)

            if not isinstance(parsed_items, list):
                parsed_items = [parsed_items]

            print(f"[AI Service] Parsed {len(parsed_items)} restaurant meals from images")
            return parsed_items

        except json.JSONDecodeError as e:
            print(f"[AI Service] JSON parsing error: {e}")
            return []
        except Exception as e:
            print(f"[AI Service] Error parsing restaurant meal images: {e}")
            import traceback
            print(f"[AI Service] Traceback: {traceback.format_exc()}")
            raise


    # ============ Nutrition Calculation Methods ============
