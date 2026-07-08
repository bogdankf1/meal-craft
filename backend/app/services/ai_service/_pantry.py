"""PantryMixin: AI Service for MealCraft mixins"""

from typing import Optional, List, Dict, Any
import json
import re
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from ._constants import GROCERY_CATEGORIES

class PantryMixin:
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
