"""EquipmentMixin: AI Service for MealCraft mixins"""

from typing import Optional, List, Dict, Any
import json
import re
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

class EquipmentMixin:
    EQUIPMENT_CATEGORIES = ["cookware", "bakeware", "appliances", "knives_cutting", "utensils", "storage", "small_tools", "specialty", "other"]
    EQUIPMENT_CONDITIONS = ["excellent", "good", "fair", "needs_repair", "replace_soon"]
    EQUIPMENT_LOCATIONS = ["kitchen_drawer", "cabinet", "countertop", "pantry", "storage", "other"]

    def _validate_equipment_category(self, category: Optional[str]) -> Optional[str]:
        """Validate and normalize equipment category."""
        if not category:
            return None
        category_lower = category.lower().strip().replace(" ", "_").replace("&", "_").replace("-", "_")

        # Direct match
        if category_lower in self.EQUIPMENT_CATEGORIES:
            return category_lower

        # Common mappings
        mappings = {
            "knives": "knives_cutting",
            "cutting": "knives_cutting",
            "knives_and_cutting": "knives_cutting",
            "knife": "knives_cutting",
            "pots": "cookware",
            "pans": "cookware",
            "pot": "cookware",
            "pan": "cookware",
            "blender": "appliances",
            "mixer": "appliances",
            "toaster": "appliances",
            "baking": "bakeware",
            "spatula": "utensils",
            "spoon": "utensils",
            "ladle": "utensils",
            "container": "storage",
            "containers": "storage",
            "gadget": "small_tools",
            "gadgets": "small_tools",
            "tools": "small_tools",
            "tool": "small_tools",
        }
        if category_lower in mappings:
            return mappings[category_lower]

        # Partial match
        for valid_cat in self.EQUIPMENT_CATEGORIES:
            if category_lower in valid_cat or valid_cat in category_lower:
                return valid_cat

        return "other"

    def _validate_equipment_condition(self, condition: Optional[str]) -> str:
        """Validate and normalize equipment condition."""
        if not condition:
            return "good"
        condition_lower = condition.lower().strip().replace(" ", "_")

        if condition_lower in self.EQUIPMENT_CONDITIONS:
            return condition_lower

        # Common mappings
        mappings = {
            "new": "excellent",
            "like_new": "excellent",
            "great": "excellent",
            "ok": "fair",
            "okay": "fair",
            "used": "fair",
            "worn": "fair",
            "broken": "needs_repair",
            "damaged": "needs_repair",
            "old": "replace_soon",
        }
        return mappings.get(condition_lower, "good")

    def _validate_equipment_location(self, location: Optional[str]) -> str:
        """Validate and normalize equipment location."""
        if not location:
            return "cabinet"
        location_lower = location.lower().strip().replace(" ", "_")

        if location_lower in self.EQUIPMENT_LOCATIONS:
            return location_lower

        # Common mappings
        mappings = {
            "drawer": "kitchen_drawer",
            "drawers": "kitchen_drawer",
            "counter": "countertop",
            "top": "countertop",
            "shelf": "cabinet",
            "cupboard": "cabinet",
            "closet": "storage",
            "garage": "storage",
            "basement": "storage",
        }
        return mappings.get(location_lower, "cabinet")

    async def parse_kitchen_equipment_text(
        self,
        text: str,
        default_category: Optional[str] = None,
        default_location: str = "cabinet",
        db: Optional[AsyncSession] = None,
        user_id: Optional[UUID] = None,
    ) -> List[Dict[str, Any]]:
        """
        Parse free-form text into structured kitchen equipment items using AI

        Args:
            text: Free-form text containing kitchen equipment items
            default_category: Default category to use if not detected
            default_location: Default storage location
            db: Database session (optional)
            user_id: User ID (optional)

        Returns:
            List of parsed kitchen equipment items
        """
        prompt = f"""You are a kitchen equipment inventory parser. Parse the following text into INDIVIDUAL kitchen equipment items.

TEXT TO PARSE:
{text}

VALID CATEGORIES:
{', '.join(self.EQUIPMENT_CATEGORIES)}

VALID CONDITIONS:
{', '.join(self.EQUIPMENT_CONDITIONS)}

VALID STORAGE LOCATIONS:
{', '.join(self.EQUIPMENT_LOCATIONS)}

RULES:
1. IMPORTANT: Split the text into SEPARATE items - each equipment item should be its own object
2. Text like "KitchenAid mixer, cast iron skillet, chef's knife" should produce THREE separate items
3. Try to identify brand names (KitchenAid, Le Creuset, Cuisinart, Lodge, Wusthof, etc.)
4. Try to identify model numbers or specific product names
5. Assign the most appropriate category:
   - cookware: pots, pans, skillets, dutch ovens, woks
   - bakeware: baking sheets, cake pans, muffin tins, pie dishes
   - appliances: mixers, blenders, food processors, toasters, coffee makers
   - knives_cutting: chef's knives, cutting boards, knife sets, peelers
   - utensils: spatulas, ladles, whisks, tongs, spoons
   - storage: containers, jars, canisters
   - small_tools: thermometers, timers, scales, graters, zesters
   - specialty: pasta makers, ice cream makers, sous vide
6. If a condition is mentioned (new, used, excellent, needs repair), use it; otherwise default to "good"
7. If a location is mentioned (drawer, cabinet, countertop), use it; otherwise use "{default_location}"
8. If a price is mentioned, include it as purchase_price
9. If a date is mentioned for purchase, include it as purchase_date (YYYY-MM-DD format)
10. Parse items in Russian/Ukrainian too: "сковорода", "каструля", "ніж"
11. This text may come from voice transcription - ignore filler words

Return ONLY a valid JSON array of objects with these exact fields:
- name (string, required) - clean equipment name with brand if known
- category (string from valid categories)
- brand (string or null) - manufacturer/brand name
- model (string or null) - model name/number
- condition (string from valid conditions, default "good")
- location (string from valid locations, default "{default_location}")
- purchase_date (string in YYYY-MM-DD format or null)
- purchase_price (number or null) - price in user's currency
- notes (string or null) - any additional notes

Example input: "KitchenAid Artisan mixer, Lodge 10 inch cast iron skillet needs seasoning, my old Wusthof chef knife in the drawer"
Example output:
[
  {{"name": "KitchenAid Artisan Mixer", "category": "appliances", "brand": "KitchenAid", "model": "Artisan", "condition": "good", "location": "countertop", "purchase_date": null, "purchase_price": null, "notes": null}},
  {{"name": "Lodge 10\" Cast Iron Skillet", "category": "cookware", "brand": "Lodge", "model": "10 inch", "condition": "fair", "location": "cabinet", "purchase_date": null, "purchase_price": null, "notes": "needs seasoning"}},
  {{"name": "Wusthof Chef's Knife", "category": "knives_cutting", "brand": "Wusthof", "model": null, "condition": "fair", "location": "kitchen_drawer", "purchase_date": null, "purchase_price": null, "notes": "old"}}
]

JSON array:"""

        try:
            print(f"[AI Service] Parsing kitchen equipment text: {text[:100]}...")
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a precise kitchen equipment inventory parser. Always return valid JSON arrays. Parse each item separately. Identify brands when possible.",
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

            parsed_items = json.loads(result_text)

            # Validate and convert to KitchenEquipmentCreate format
            from app.schemas.kitchen_equipment import KitchenEquipmentCreate, EquipmentCategory, EquipmentCondition, EquipmentLocation

            validated_items = []
            for item in parsed_items:
                if not item.get("name"):
                    continue

                category = self._validate_equipment_category(item.get("category")) or default_category or "other"
                condition = self._validate_equipment_condition(item.get("condition"))
                location = self._validate_equipment_location(item.get("location")) or default_location

                validated_items.append(KitchenEquipmentCreate(
                    name=str(item.get("name", "")).strip(),
                    category=EquipmentCategory(category) if category else None,
                    brand=str(item["brand"]).strip() if item.get("brand") else None,
                    model=str(item["model"]).strip() if item.get("model") else None,
                    condition=EquipmentCondition(condition),
                    location=EquipmentLocation(location),
                    purchase_date=date.fromisoformat(item["purchase_date"]) if item.get("purchase_date") else None,
                    purchase_price=float(item["purchase_price"]) if item.get("purchase_price") else None,
                    notes=str(item["notes"]).strip() if item.get("notes") else None,
                ))

            print(f"[AI Service] Parsed {len(validated_items)} kitchen equipment items from text")
            return validated_items

        except json.JSONDecodeError as e:
            print(f"[AI Service] JSON parsing error: {e}")
            print(f"[AI Service] Raw response: {result_text}")
            return []
        except Exception as e:
            print(f"[AI Service] Error parsing kitchen equipment text: {e}")
            import traceback
            print(f"[AI Service] Traceback: {traceback.format_exc()}")
            raise

    async def parse_kitchen_equipment_voice(
        self,
        audio_content: bytes,
        filename: str,
        language: str = "auto",
        default_category: Optional[str] = None,
        default_location: str = "cabinet",
        db: Optional[AsyncSession] = None,
        user_id: Optional[UUID] = None,
    ) -> List[Dict[str, Any]]:
        """
        Transcribe voice recording and parse kitchen equipment items

        Args:
            audio_content: Audio file bytes
            filename: Original filename
            language: Language code or "auto"
            default_category: Default category
            default_location: Default storage location
            db: Database session
            user_id: User ID

        Returns:
            List of parsed kitchen equipment items
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
        print(f"[AI Service] Kitchen equipment voice transcription: {transcribed_text}")

        if not transcribed_text or len(transcribed_text.strip()) < 3:
            return []

        # Parse the transcribed text
        return await self.parse_kitchen_equipment_text(
            text=transcribed_text,
            default_category=default_category,
            default_location=default_location,
            db=db,
            user_id=user_id,
        )

    async def parse_kitchen_equipment_images(
        self,
        images: List[Dict[str, Any]],
        import_type: str = "equipment",
        default_category: Optional[str] = None,
        default_location: str = "cabinet",
        db: Optional[AsyncSession] = None,
        user_id: Optional[UUID] = None,
    ) -> List[Dict[str, Any]]:
        """
        Parse kitchen equipment from one or more images using GPT-4o vision

        Args:
            images: List of image data dicts with 'content' and 'filename' keys
            import_type: Type of import (equipment, screenshot)
            default_category: Default category
            default_location: Default storage location
            db: Database session
            user_id: User ID

        Returns:
            List of parsed kitchen equipment items
        """
        import base64

        print(f"[AI Service] Parsing {len(images)} kitchen equipment images of type: {import_type}")

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
            "equipment": "This is a photo of kitchen equipment. Identify each item visible in the image.",
            "screenshot": "This is a screenshot of a kitchen equipment list or inventory app. Extract all items shown.",
        }

        context = context_instructions.get(import_type, context_instructions["equipment"])

        prompt = f"""You are a kitchen equipment inventory parser with vision capabilities.

CONTEXT: {context}

{"IMPORTANT: These are MULTIPLE images. Parse ALL items from ALL images and combine them into ONE list. Avoid duplicates." if len(images) > 1 else ""}

VALID CATEGORIES:
{', '.join(self.EQUIPMENT_CATEGORIES)}

VALID CONDITIONS:
{', '.join(self.EQUIPMENT_CONDITIONS)}

VALID STORAGE LOCATIONS:
{', '.join(self.EQUIPMENT_LOCATIONS)}

RULES:
1. Extract EVERY visible kitchen equipment item from {"all images" if len(images) > 1 else "the image"}
2. For each item, try to identify:
   - Product name with brand if visible (e.g., "KitchenAid Stand Mixer")
   - Brand name (KitchenAid, Cuisinart, Le Creuset, Lodge, All-Clad, etc.)
   - Model name/number if visible
   - Category based on what type of equipment it is
   - Condition - assess from appearance (scratches, wear, rust = fair/needs_repair)
   - Location if visible (countertop, in drawer, etc.)
3. For equipment photos:
   - Look for brand logos and markings
   - Estimate condition from visual appearance
   - Note any visible damage or wear
4. For screenshots:
   - Extract all listed items
   - Include any details shown (price, date, etc.)
5. Ukrainian/Russian equipment names are acceptable

Return ONLY a valid JSON array of objects with these exact fields:
- name (string, required) - equipment name with brand if known
- category (string from valid categories)
- brand (string or null)
- model (string or null)
- condition (string from valid conditions, default "good")
- location (string from valid locations, default "{default_location}")
- purchase_date (string in YYYY-MM-DD format or null)
- purchase_price (number or null)
- notes (string or null) - any observations about condition, etc.

JSON array:"""

        try:
            messages = [
                {
                    "role": "system",
                    "content": "You are a precise kitchen equipment inventory parser with vision capabilities. Identify equipment items, brands, and assess condition from images. Return valid JSON."
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

            parsed_items = json.loads(result_text)

            # Validate and convert to KitchenEquipmentCreate format
            from app.schemas.kitchen_equipment import KitchenEquipmentCreate, EquipmentCategory, EquipmentCondition, EquipmentLocation

            validated_items = []
            seen_items = set()  # To avoid duplicates

            for item in parsed_items:
                if not item.get("name"):
                    continue

                # Create key for deduplication
                item_key = (
                    str(item.get("name", "")).strip().lower(),
                    item.get("brand", ""),
                )

                if item_key in seen_items:
                    continue
                seen_items.add(item_key)

                category = self._validate_equipment_category(item.get("category")) or default_category or "other"
                condition = self._validate_equipment_condition(item.get("condition"))
                location = self._validate_equipment_location(item.get("location")) or default_location

                validated_items.append(KitchenEquipmentCreate(
                    name=str(item.get("name", "")).strip(),
                    category=EquipmentCategory(category) if category else None,
                    brand=str(item["brand"]).strip() if item.get("brand") else None,
                    model=str(item["model"]).strip() if item.get("model") else None,
                    condition=EquipmentCondition(condition),
                    location=EquipmentLocation(location),
                    purchase_date=date.fromisoformat(item["purchase_date"]) if item.get("purchase_date") else None,
                    purchase_price=float(item["purchase_price"]) if item.get("purchase_price") else None,
                    notes=str(item["notes"]).strip() if item.get("notes") else None,
                ))

            print(f"[AI Service] Parsed {len(validated_items)} kitchen equipment items from {len(images)} image(s)")
            return validated_items

        except json.JSONDecodeError as e:
            print(f"[AI Service] JSON parsing error: {e}")
            print(f"[AI Service] Raw response: {result_text}")
            return []
        except Exception as e:
            print(f"[AI Service] Error parsing kitchen equipment images: {e}")
            import traceback
            print(f"[AI Service] Traceback: {traceback.format_exc()}")
            raise
