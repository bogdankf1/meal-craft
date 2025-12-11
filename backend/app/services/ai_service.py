"""
AI Service for MealCraft
Handles text parsing for groceries, categorization, and insights
"""
from typing import Optional, List, Dict, Any
from openai import OpenAI
import json
import re
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.core.config import settings
from app.models.ai import CategoryCorrection, TextParsingHistory
from app.models.grocery import GroceryCategory


# Valid grocery categories (from GroceryCategory enum)
GROCERY_CATEGORIES = [cat.value for cat in GroceryCategory]


class AIService:
    """AI-powered service for text parsing and categorization"""

    def __init__(self):
        self._client = None

    @property
    def client(self):
        """Lazy-load OpenAI client"""
        if self._client is None:
            api_key = settings.OPENAI_API_KEY
            if not api_key or len(api_key.strip()) == 0:
                raise ValueError("OPENAI_API_KEY environment variable not set or empty")
            self._client = OpenAI(api_key=api_key.strip())
        return self._client

    async def parse_grocery_text(
        self,
        text: str,
        db: Optional[AsyncSession] = None,
        user_id: Optional[UUID] = None,
    ) -> List[Dict[str, Any]]:
        """
        Parse free-form text into structured grocery items using AI

        Args:
            text: Free-form text containing grocery items
            db: Database session (optional, for learning from corrections)
            user_id: User ID (optional, for learning from user's history)

        Returns:
            List of parsed grocery items with fields:
            - item_name: str
            - quantity: float | None
            - unit: str | None
            - category: str | None
            - expiry_date: str | None (YYYY-MM-DD format)
            - cost: float | None
            - store: str | None
        """
        # Get user's correction history for learning
        user_corrections = ""
        if db and user_id:
            corrections = await self._get_user_corrections(db, user_id, limit=15)
            if corrections:
                user_corrections = "\n\nUser's past category corrections (learn from these):\n"
                for corr in corrections:
                    user_corrections += f"- '{corr.item_name}' → '{corr.correct_category}'\n"

        prompt = f"""You are a grocery list parser. Parse the following text into INDIVIDUAL structured grocery items.

TEXT TO PARSE:
{text}

VALID CATEGORIES:
{', '.join(GROCERY_CATEGORIES)}

RULES:
1. IMPORTANT: Split the text into SEPARATE items - each grocery product should be its own object
2. Text like "2kg beef, 6 apples, milk" should produce THREE separate items, not one
3. If the text mentions a store (e.g., "from Silpo", "at Walmart"), apply that store to ALL items
4. Identify quantity and unit for each item (e.g., "2 kg", "500g", "3 packs", "6 apples" = quantity 6)
5. Assign the most appropriate category from the valid categories list
6. If a price/cost is mentioned for an item, include it
7. If an expiry date is mentioned, include it in YYYY-MM-DD format
8. Be smart about parsing - "milk 2L $3.50" should become item_name="milk", quantity=2, unit="l", cost=3.50
9. Common unit abbreviations: kg, g, l, ml, pcs (pieces), pack, box, bag, bottle, can
10. Numbers before items usually indicate quantity: "6 apples" = quantity 6, unit "pcs"
11. Parse items in Russian/Ukrainian too: "молоко", "яблука", "м'ясо"
12. This text may come from voice transcription - ignore filler words like "um", "uh", "like", "so", "and then"
13. Voice transcriptions often have phrases like "I need", "I want to buy", "add" - extract the actual items
14. If the text seems incomplete or has transcription errors, try to infer the grocery items anyway
{user_corrections}

Return ONLY a valid JSON array of objects with these exact fields:
- item_name (string, required) - just the product name, not the full sentence
- quantity (number or null)
- unit (string or null)
- category (string from valid categories or null)
- expiry_date (string in YYYY-MM-DD format or null)
- cost (number or null)
- store (string or null)

Example input: "All groceries from Silpo: 2kg of beef cheeks, 6 apples, 2 liters of condensed milk"
Example output:
[
  {{"item_name": "beef cheeks", "quantity": 2, "unit": "kg", "category": "meat", "expiry_date": null, "cost": null, "store": "Silpo"}},
  {{"item_name": "apples", "quantity": 6, "unit": "pcs", "category": "produce", "expiry_date": null, "cost": null, "store": "Silpo"}},
  {{"item_name": "condensed milk", "quantity": 2, "unit": "l", "category": "dairy", "expiry_date": null, "cost": null, "store": "Silpo"}}
]

JSON array:"""

        try:
            print(f"[AI Service] Parsing text: {text[:100]}...")
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a precise grocery list parser. Always return valid JSON arrays. Never include explanations, only the JSON array.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=2000,
            )

            result_text = response.choices[0].message.content.strip()
            print(f"[AI Service] Raw response: {result_text[:500]}...")

            # Clean up the response - remove markdown code blocks if present
            if result_text.startswith("```"):
                result_text = re.sub(r'^```json?\s*', '', result_text)
                result_text = re.sub(r'\s*```$', '', result_text)

            # Parse JSON
            parsed_items = json.loads(result_text)

            # Validate and clean items
            validated_items = []
            for item in parsed_items:
                if not item.get("item_name"):
                    continue

                validated_item = {
                    "item_name": str(item.get("item_name", "")).strip(),
                    "quantity": float(item["quantity"]) if item.get("quantity") is not None else None,
                    "unit": str(item["unit"]).lower() if item.get("unit") else None,
                    "category": self._validate_category(item.get("category")),
                    "expiry_date": item.get("expiry_date"),
                    "cost": float(item["cost"]) if item.get("cost") is not None else None,
                    "store": str(item["store"]).strip() if item.get("store") else None,
                }
                validated_items.append(validated_item)

            # Save parsing history
            if db and user_id and validated_items:
                history = TextParsingHistory(
                    user_id=user_id,
                    input_text=text,
                    parsed_items=validated_items,
                    items_count=len(validated_items),
                    parsing_type="grocery",
                    status="completed",
                )
                db.add(history)
                await db.commit()

            return validated_items

        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Raw response: {result_text}")
            return []
        except Exception as e:
            print(f"AI text parsing error: {e}")
            return []

    async def categorize_grocery_item(
        self,
        item_name: str,
        db: Optional[AsyncSession] = None,
        user_id: Optional[UUID] = None,
    ) -> str:
        """
        Categorize a single grocery item using AI

        Args:
            item_name: Name of the grocery item
            db: Database session (optional)
            user_id: User ID (optional)

        Returns:
            Category name
        """
        # Get user's correction history
        user_corrections = ""
        if db and user_id:
            corrections = await self._get_user_corrections(db, user_id, limit=10)
            if corrections:
                user_corrections = "\n\nUser's past corrections:\n"
                for corr in corrections:
                    user_corrections += f"- '{corr.item_name}' → '{corr.correct_category}'\n"

        prompt = f"""Categorize this grocery item into ONE of these categories:

{', '.join(GROCERY_CATEGORIES)}

Item: {item_name}

Rules:
1. Return ONLY the category name, nothing else
2. Choose the most specific category that fits
3. If unsure, use "other"
{user_corrections}

Category:"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a grocery categorization assistant. Return exactly one category name.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=20,
            )

            category = response.choices[0].message.content.strip().lower()
            return self._validate_category(category) or "other"

        except Exception as e:
            print(f"AI categorization error: {e}")
            return "other"

    async def batch_categorize_items(
        self,
        item_names: List[str],
        db: Optional[AsyncSession] = None,
        user_id: Optional[UUID] = None,
    ) -> List[str]:
        """
        Batch categorize multiple grocery items

        Args:
            item_names: List of item names to categorize

        Returns:
            List of category names in same order as input
        """
        categories = []
        for name in item_names:
            category = await self.categorize_grocery_item(name, db, user_id)
            categories.append(category)
        return categories

    async def save_category_correction(
        self,
        db: AsyncSession,
        user_id: UUID,
        item_name: str,
        correct_category: str,
        original_category: Optional[str] = None,
    ):
        """Save a user's category correction for future learning"""
        correction = CategoryCorrection(
            user_id=user_id,
            item_name=item_name,
            correct_category=correct_category,
            original_category=original_category,
        )
        db.add(correction)
        await db.commit()

    def _validate_category(self, category: Optional[str]) -> Optional[str]:
        """Validate and normalize category name"""
        if not category:
            return None

        category_lower = category.lower().strip()

        # Direct match
        if category_lower in GROCERY_CATEGORIES:
            return category_lower

        # Try to find closest match
        for valid_cat in GROCERY_CATEGORIES:
            if category_lower in valid_cat or valid_cat in category_lower:
                return valid_cat

        return None

    async def _get_user_corrections(
        self, db: AsyncSession, user_id: UUID, limit: int = 10
    ) -> List[CategoryCorrection]:
        """Get user's recent category corrections"""
        result = await db.execute(
            select(CategoryCorrection)
            .where(CategoryCorrection.user_id == user_id)
            .order_by(CategoryCorrection.corrected_at.desc())
            .limit(limit)
        )
        return result.scalars().all()

    async def transcribe_audio(self, audio_file, language: str = "auto") -> str:
        """
        Transcribe audio to text using OpenAI Whisper API

        Args:
            audio_file: Audio file object (from FastAPI UploadFile)
            language: Language code (e.g., "en", "uk", "ru") or "auto" for auto-detect

        Returns:
            Transcribed text
        """
        try:
            print(f"[AI Service] Transcribing audio, language: {language}")

            # Prepare language parameter (None for auto-detect)
            lang_param = None if language == "auto" else language

            response = self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=lang_param,
            )

            transcribed_text = response.text.strip()
            print(f"[AI Service] Transcribed text: {transcribed_text[:200]}...")

            return transcribed_text

        except Exception as e:
            print(f"[AI Service] Transcription error: {e}")
            raise

    async def transcribe_and_parse_groceries(
        self,
        audio_file,
        language: str = "auto",
        db: Optional[AsyncSession] = None,
        user_id: Optional[UUID] = None,
    ) -> tuple[List[Dict[str, Any]], str]:
        """
        Transcribe audio and parse into grocery items

        Args:
            audio_file: Audio file object
            language: Language code or "auto"
            db: Database session
            user_id: User ID

        Returns:
            Tuple of (list of parsed grocery items, transcribed text)
        """
        # First transcribe
        transcribed_text = await self.transcribe_audio(audio_file, language)
        print(f"[AI Service] Full transcribed text: '{transcribed_text}'")

        if not transcribed_text or len(transcribed_text.strip()) < 3:
            print("[AI Service] Transcription too short or empty")
            return [], transcribed_text or ""

        # Then parse the transcribed text
        result = await self.parse_grocery_text(transcribed_text, db, user_id)
        print(f"[AI Service] Parsed {len(result)} items from voice")
        return result, transcribed_text

    async def parse_receipt_from_url(
        self,
        url: str,
        db: Optional[AsyncSession] = None,
        user_id: Optional[UUID] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetch a receipt from URL and parse grocery items using AI with vision

        Args:
            url: URL of the digital receipt
            db: Database session (optional)
            user_id: User ID (optional)

        Returns:
            List of parsed grocery items
        """
        import httpx
        from bs4 import BeautifulSoup
        import base64

        print(f"[AI Service] Parsing receipt from URL: {url}")

        try:
            # Fetch the receipt page
            async with httpx.AsyncClient(
                follow_redirects=True,
                timeout=30.0,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                    "Accept-Language": "uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7,ru;q=0.6",
                }
            ) as client:
                response = await client.get(url)
                response.raise_for_status()

            html_content = response.text
            print(f"[AI Service] Fetched {len(html_content)} bytes of HTML")

            # Parse HTML and extract text content
            soup = BeautifulSoup(html_content, 'html.parser')

            # Remove script and style elements
            for element in soup(["script", "style", "nav", "footer", "header"]):
                element.decompose()

            # Get text content
            text_content = soup.get_text(separator='\n', strip=True)

            # Limit text length for API
            if len(text_content) > 15000:
                text_content = text_content[:15000]

            print(f"[AI Service] Extracted {len(text_content)} chars of text from receipt")
            print(f"[AI Service] First 500 chars: {text_content[:500]}")

            # Use GPT to parse the receipt content
            prompt = f"""You are a receipt parser. Parse the following receipt content into structured grocery items.

RECEIPT CONTENT:
{text_content}

VALID CATEGORIES:
{', '.join(GROCERY_CATEGORIES)}

RULES:
1. Extract EACH item from the receipt as a separate object
2. IMPORTANT - Clean up item names to be human-readable:
   - Receipt names are often abbreviated/compressed like "Бул6*55BimbГамбПосип"
   - Expand these to readable names like "Булка Bimbo Гамбургерна 6шт"
   - "Сир125PayВреБрі50%В" → "Сир President Brie 50% 125г"
   - "Нап0.25CocaCola3/б" → "Coca-Cola 0.25л"
   - "Мол870ПасПростон2,5%" → "Молоко Простоквашино 2.5% 870мл"
   - Extract size/weight from the name and keep it in the readable name
   - Keep brand names recognizable (Bimbo, Coca-Cola, President, etc.)
3. Look for quantity, unit (кг, шт, л, etc.), and price
4. STORE NAME - Use simple store name, NOT legal entity name:
   - "ТОВ Сільпо-Фуд" or "ТОВ "Сільпо-Фуд"" → "Сільпо"
   - "ТОВ АТБ-Маркет" → "АТБ"
   - "ТОВ Новус Україна" → "Novus"
   - Just use the brand name customers know
5. Prices in Ukrainian receipts use format like "123.45" or "123,45"
6. "шт" means pieces, "кг" means kg, "л" means liters, "г" means grams
7. Assign appropriate categories based on item names:
   - молоко, сир, йогурт, кефір, сметана = dairy
   - хліб, булка, батон = bakery
   - яйця = dairy
   - м'ясо, ковбаса, шинка, курка = meat
   - овочі, фрукти, яблука, банани, цибуля = produce
   - риба, кальмар, креветки = seafood
   - напій, сік, вода, кола, пиво, сидр = beverages
   - чіпси, снеки, горішки = snacks
   - соус, кетчуп, гірчиця, майонез = condiments

Return ONLY a valid JSON array of objects with these exact fields:
- item_name (string, required) - CLEANED UP readable product name
- quantity (number or null)
- unit (string or null) - normalized (kg, g, l, ml, pcs)
- category (string from valid categories or null)
- expiry_date (string in YYYY-MM-DD format or null)
- cost (number or null) - price for the line item
- store (string or null) - SIMPLE store brand name (Сільпо, АТБ, Novus, etc.)

JSON array:"""

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a precise receipt parser for Ukrainian supermarkets. Always return valid JSON arrays. Parse every item visible on the receipt. IMPORTANT: Convert abbreviated receipt names into clean, human-readable product names. Use simple store brand names (Сільпо, АТБ) instead of legal entity names (ТОВ Сільпо-Фуд).",
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

            # Parse JSON
            parsed_items = json.loads(result_text)

            # Validate and clean items
            validated_items = []
            for item in parsed_items:
                if not item.get("item_name"):
                    continue

                validated_item = {
                    "item_name": str(item.get("item_name", "")).strip(),
                    "quantity": float(item["quantity"]) if item.get("quantity") is not None else None,
                    "unit": str(item["unit"]).lower() if item.get("unit") else None,
                    "category": self._validate_category(item.get("category")),
                    "expiry_date": item.get("expiry_date"),
                    "cost": float(item["cost"]) if item.get("cost") is not None else None,
                    "store": str(item["store"]).strip() if item.get("store") else None,
                }
                validated_items.append(validated_item)

            print(f"[AI Service] Parsed {len(validated_items)} items from receipt URL")
            return validated_items

        except httpx.HTTPError as e:
            print(f"[AI Service] HTTP error fetching receipt: {e}")
            raise ValueError(f"Could not fetch receipt: {str(e)}")
        except json.JSONDecodeError as e:
            print(f"[AI Service] JSON parsing error: {e}")
            print(f"[AI Service] Raw response: {result_text}")
            return []
        except Exception as e:
            print(f"[AI Service] Error parsing receipt URL: {e}")
            import traceback
            print(f"[AI Service] Traceback: {traceback.format_exc()}")
            raise


    async def parse_grocery_images(
        self,
        images: List[bytes],
        import_type: str = "delivery_app",
        db: Optional[AsyncSession] = None,
        user_id: Optional[UUID] = None,
    ) -> List[Dict[str, Any]]:
        """
        Parse grocery items from one or more images using GPT-4o vision

        Args:
            images: List of image bytes
            import_type: Type of import (groceries, paper_receipt, digital_receipt, delivery_app)
            db: Database session (optional)
            user_id: User ID (optional)

        Returns:
            List of parsed grocery items
        """
        import base64

        print(f"[AI Service] Parsing {len(images)} images of type: {import_type}")

        # Prepare image content for API
        image_contents = []
        for i, image_data in enumerate(images):
            base64_image = base64.b64encode(image_data).decode('utf-8')
            # Detect image type from bytes
            image_type = "image/png"
            if image_data[:3] == b'\xff\xd8\xff':
                image_type = "image/jpeg"
            elif image_data[:4] == b'\x89PNG':
                image_type = "image/png"
            elif image_data[:4] == b'RIFF':
                image_type = "image/webp"

            image_contents.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{image_type};base64,{base64_image}",
                    "detail": "high"
                }
            })
            print(f"[AI Service] Added image {i+1}: {len(image_data)} bytes, type: {image_type}")

        # Build context-specific prompt
        context_instructions = {
            "groceries": "This is a photo of groceries. Identify each product visible in the image.",
            "paper_receipt": "This is a photo of a paper receipt. Extract all purchased items.",
            "digital_receipt": "This is a screenshot of a digital receipt. Extract all purchased items.",
            "delivery_app": "These are screenshots from a grocery delivery app (like Silpo, Glovo, etc.). Extract ALL items from ALL screenshots, including names, quantities, and prices."
        }

        context = context_instructions.get(import_type, context_instructions["groceries"])

        # Get user's correction history for learning
        user_corrections = ""
        if db and user_id:
            corrections = await self._get_user_corrections(db, user_id, limit=10)
            if corrections:
                user_corrections = "\n\nUser's past category corrections (learn from these):\n"
                for corr in corrections:
                    user_corrections += f"- '{corr.item_name}' → '{corr.correct_category}'\n"

        prompt = f"""You are a grocery item parser with vision capabilities.

CONTEXT: {context}

{"IMPORTANT: These are MULTIPLE screenshots of the same order. Parse ALL items from ALL images and combine them into ONE list. Avoid duplicates - if the same item appears in multiple screenshots, include it only once." if len(images) > 1 else ""}

VALID CATEGORIES:
{', '.join(GROCERY_CATEGORIES)}

RULES:
1. Extract EVERY visible grocery item from {"all images" if len(images) > 1 else "the image"}
2. For each item, try to identify:
   - Product name (clean, readable name)
   - Quantity (number of items or weight)
   - Unit (kg, g, l, ml, pcs, pack, etc.)
   - Price/cost if visible
   - Category from the valid categories list
3. For delivery app screenshots:
   - Items usually show: product image, name, quantity, price
   - Look for the store name (Сільпо, АТБ, Novus, etc.)
   - Ukrainian text is expected: "шт" = pieces, "кг" = kg, "₴" = price in UAH
4. For paper receipts:
   - Look for abbreviated names and expand them
   - Prices are usually on the right side
5. Use simple store names (Сільпо, not ТОВ Сільпо-Фуд)
{user_corrections}

Return ONLY a valid JSON array of objects with these exact fields:
- item_name (string, required) - readable product name
- quantity (number or null)
- unit (string or null) - normalized (kg, g, l, ml, pcs)
- category (string from valid categories or null)
- expiry_date (string in YYYY-MM-DD format or null)
- cost (number or null) - price in UAH
- store (string or null) - simple store name

JSON array:"""

        try:
            # Build messages with images
            messages = [
                {
                    "role": "system",
                    "content": "You are a precise grocery parser with vision capabilities. Parse grocery items from images and return valid JSON. For Ukrainian products and stores, use clean Ukrainian names."
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
                model="gpt-4o",  # Use GPT-4o for vision
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

            # Parse JSON
            parsed_items = json.loads(result_text)

            # Validate and clean items
            validated_items = []
            seen_items = set()  # To avoid duplicates across images

            for item in parsed_items:
                if not item.get("item_name"):
                    continue

                # Create a key for deduplication
                item_key = (
                    str(item.get("item_name", "")).strip().lower(),
                    item.get("quantity"),
                    item.get("cost")
                )

                if item_key in seen_items:
                    continue
                seen_items.add(item_key)

                validated_item = {
                    "item_name": str(item.get("item_name", "")).strip(),
                    "quantity": float(item["quantity"]) if item.get("quantity") is not None else None,
                    "unit": str(item["unit"]).lower() if item.get("unit") else None,
                    "category": self._validate_category(item.get("category")),
                    "expiry_date": item.get("expiry_date"),
                    "cost": float(item["cost"]) if item.get("cost") is not None else None,
                    "store": str(item["store"]).strip() if item.get("store") else None,
                }
                validated_items.append(validated_item)

            print(f"[AI Service] Parsed {len(validated_items)} items from {len(images)} image(s)")
            return validated_items

        except json.JSONDecodeError as e:
            print(f"[AI Service] JSON parsing error: {e}")
            print(f"[AI Service] Raw response: {result_text}")
            return []
        except Exception as e:
            print(f"[AI Service] Error parsing images: {e}")
            import traceback
            print(f"[AI Service] Traceback: {traceback.format_exc()}")
            raise


    # ============ Pantry Parsing Methods ============

    STORAGE_LOCATIONS = ["pantry", "fridge", "freezer", "cabinet", "spice_rack", "other"]

    async def parse_pantry_text(
        self,
        text: str,
        default_storage_location: str = "pantry",
        db: Optional[AsyncSession] = None,
        user_id: Optional[UUID] = None,
    ) -> List[Dict[str, Any]]:
        """
        Parse free-form text into structured pantry items using AI
        """
        prompt = f"""You are a pantry inventory parser. Parse the following text into INDIVIDUAL pantry items.

TEXT TO PARSE:
{text}

VALID CATEGORIES:
{', '.join(GROCERY_CATEGORIES)}

VALID STORAGE LOCATIONS:
{', '.join(self.STORAGE_LOCATIONS)}

RULES:
1. IMPORTANT: Split the text into SEPARATE items - each product should be its own object
2. Text like "sugar, flour, rice" should produce THREE separate items
3. Identify quantity and unit for each item (e.g., "2 kg", "500g", "3 packs")
4. Assign the most appropriate category from the valid categories list
5. If a storage location is mentioned (e.g., "in the fridge", "freezer"), use it; otherwise use "{default_storage_location}"
6. Common unit abbreviations: kg, g, l, ml, pcs (pieces), pack, box, bag, bottle, can
7. Parse items in Russian/Ukrainian too: "цукор", "борошно", "рис"
8. This text may come from voice transcription - ignore filler words

Return ONLY a valid JSON array of objects with these exact fields:
- item_name (string, required) - just the product name
- quantity (number or null)
- unit (string or null)
- category (string from valid categories or null)
- storage_location (string from valid locations, default "{default_storage_location}")
- expiry_date (string in YYYY-MM-DD format or null)

JSON array:"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a precise pantry inventory parser. Always return valid JSON arrays. Parse each item separately.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=4000,
            )

            result_text = response.choices[0].message.content.strip()

            # Clean up markdown code blocks
            if result_text.startswith("```"):
                result_text = re.sub(r'^```json?\s*', '', result_text)
                result_text = re.sub(r'\s*```$', '', result_text)

            parsed_items = json.loads(result_text)

            # Validate and convert to PantryItemCreate format
            from app.schemas.pantry import PantryItemCreate, StorageLocation, PantryCategory

            validated_items = []
            for item in parsed_items:
                if not item.get("item_name"):
                    continue

                storage_loc = item.get("storage_location", default_storage_location)
                if storage_loc not in self.STORAGE_LOCATIONS:
                    storage_loc = default_storage_location

                category = self._validate_category(item.get("category"))

                validated_items.append(PantryItemCreate(
                    item_name=str(item.get("item_name", "")).strip(),
                    quantity=float(item["quantity"]) if item.get("quantity") is not None else None,
                    unit=str(item["unit"]).lower() if item.get("unit") else None,
                    category=PantryCategory(category) if category else None,
                    storage_location=StorageLocation(storage_loc),
                    expiry_date=date.fromisoformat(item["expiry_date"]) if item.get("expiry_date") else None,
                ))

            return validated_items

        except Exception as e:
            print(f"[AI Service] Error parsing pantry text: {e}")
            import traceback
            print(f"[AI Service] Traceback: {traceback.format_exc()}")
            raise

    async def parse_pantry_voice(
        self,
        audio_content: bytes,
        filename: str,
        language: str = "auto",
        default_storage_location: str = "pantry",
        db: Optional[AsyncSession] = None,
        user_id: Optional[UUID] = None,
    ) -> List[Dict[str, Any]]:
        """
        Transcribe voice recording and parse pantry items
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
        print(f"[AI Service] Pantry voice transcription: {transcribed_text}")

        if not transcribed_text or len(transcribed_text.strip()) < 3:
            return []

        # Parse the transcribed text
        return await self.parse_pantry_text(
            text=transcribed_text,
            default_storage_location=default_storage_location,
            db=db,
            user_id=user_id,
        )

    async def parse_pantry_images(
        self,
        images: List[Dict[str, Any]],
        import_type: str = "pantry",
        default_storage_location: str = "pantry",
        db: Optional[AsyncSession] = None,
        user_id: Optional[UUID] = None,
    ) -> List[Dict[str, Any]]:
        """
        Parse pantry items from one or more images using GPT-4o vision
        """
        import base64

        print(f"[AI Service] Parsing {len(images)} pantry images of type: {import_type}")

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
            "pantry": "This is a photo of pantry shelves or storage area. Identify each product visible.",
            "paper_list": "This is a handwritten or printed pantry inventory list. Extract all items.",
            "screenshot": "This is a screenshot of a pantry/inventory list from an app. Extract all items.",
        }

        context = context_instructions.get(import_type, context_instructions["pantry"])

        prompt = f"""You are a pantry inventory parser with vision capabilities.

CONTEXT: {context}

VALID CATEGORIES:
{', '.join(GROCERY_CATEGORIES)}

VALID STORAGE LOCATIONS:
{', '.join(self.STORAGE_LOCATIONS)}

RULES:
1. Extract EVERY visible item from the image(s)
2. For each item, try to identify:
   - Product name (clean, readable name)
   - Quantity if visible
   - Unit (kg, g, l, ml, pcs, pack, etc.)
   - Category from the valid categories list
   - Storage location (infer from image or use "{default_storage_location}")
3. For pantry photos:
   - Identify products on shelves
   - Note if items appear to be in fridge, freezer, etc.
4. Parse text in Ukrainian/Russian as well

Return ONLY a valid JSON array of objects with these exact fields:
- item_name (string, required) - readable product name
- quantity (number or null)
- unit (string or null)
- category (string from valid categories or null)
- storage_location (string from valid locations, default "{default_storage_location}")
- expiry_date (string in YYYY-MM-DD format or null)

JSON array:"""

        try:
            messages = [
                {
                    "role": "system",
                    "content": "You are a precise pantry inventory parser with vision capabilities. Parse items from images and return valid JSON."
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

            # Clean up markdown code blocks
            if result_text.startswith("```"):
                result_text = re.sub(r'^```json?\s*', '', result_text)
                result_text = re.sub(r'\s*```$', '', result_text)

            parsed_items = json.loads(result_text)

            # Validate and convert to PantryItemCreate format
            from app.schemas.pantry import PantryItemCreate, StorageLocation, PantryCategory

            validated_items = []
            for item in parsed_items:
                if not item.get("item_name"):
                    continue

                storage_loc = item.get("storage_location", default_storage_location)
                if storage_loc not in self.STORAGE_LOCATIONS:
                    storage_loc = default_storage_location

                category = self._validate_category(item.get("category"))

                validated_items.append(PantryItemCreate(
                    item_name=str(item.get("item_name", "")).strip(),
                    quantity=float(item["quantity"]) if item.get("quantity") is not None else None,
                    unit=str(item["unit"]).lower() if item.get("unit") else None,
                    category=PantryCategory(category) if category else None,
                    storage_location=StorageLocation(storage_loc),
                    expiry_date=date.fromisoformat(item["expiry_date"]) if item.get("expiry_date") else None,
                ))

            print(f"[AI Service] Parsed {len(validated_items)} pantry items from {len(images)} image(s)")
            return validated_items

        except Exception as e:
            print(f"[AI Service] Error parsing pantry images: {e}")
            import traceback
            print(f"[AI Service] Traceback: {traceback.format_exc()}")
            raise


# Singleton instance
ai_service = AIService()
