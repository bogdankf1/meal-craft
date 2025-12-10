"""
AI Module Router
API endpoints for text parsing, categorization, and AI features
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.ai import TextParsingHistory
from app.schemas import ai as schemas
from app.services.ai_service import ai_service

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/parse-groceries", response_model=schemas.ParseGroceryTextResponse)
async def parse_grocery_text(
    request: schemas.ParseGroceryTextRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Parse free-form text into structured grocery items using AI

    Examples of input text:
    - "2kg apples, 1L milk, bread, eggs 12pcs"
    - "Bought from Walmart: chicken breast 500g $8.99, rice 2kg"
    - "milk expires Dec 15, yogurt, cheese 200g"

    Returns a list of parsed grocery items with quantities, units, categories, etc.
    """
    try:
        items = await ai_service.parse_grocery_text(
            text=request.text,
            db=db,
            user_id=current_user.id,
        )

        parsed_items = [schemas.ParsedGroceryItem(**item) for item in items]

        return schemas.ParseGroceryTextResponse(
            items=parsed_items,
            total_count=len(parsed_items),
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse text: {str(e)}",
        )


@router.post("/categorize", response_model=schemas.CategorizeItemResponse)
async def categorize_item(
    request: schemas.CategorizeItemRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Categorize a single grocery item using AI

    Returns the suggested category for the item.
    """
    try:
        category = await ai_service.categorize_grocery_item(
            item_name=request.item_name,
            db=db,
            user_id=current_user.id,
        )

        return schemas.CategorizeItemResponse(
            item_name=request.item_name,
            category=category,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Categorization failed: {str(e)}",
        )


@router.post("/batch-categorize", response_model=schemas.BatchCategorizeResponse)
async def batch_categorize_items(
    request: schemas.BatchCategorizeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Batch categorize multiple grocery items using AI

    More efficient than calling /categorize multiple times.
    """
    try:
        categories = await ai_service.batch_categorize_items(
            item_names=request.item_names,
            db=db,
            user_id=current_user.id,
        )

        return schemas.BatchCategorizeResponse(categories=categories)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch categorization failed: {str(e)}",
        )


@router.post("/save-correction", response_model=schemas.CategoryCorrectionResponse)
async def save_category_correction(
    request: schemas.CategoryCorrectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Save a user's category correction

    The AI will learn from this correction for future categorizations.
    """
    try:
        await ai_service.save_category_correction(
            db=db,
            user_id=current_user.id,
            item_name=request.item_name,
            correct_category=request.correct_category,
            original_category=request.original_category,
        )

        return schemas.CategoryCorrectionResponse(
            message="Correction saved successfully"
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save correction: {str(e)}",
        )


@router.get("/parsing-history", response_model=schemas.ParsingHistoryResponse)
async def get_parsing_history(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get user's text parsing history

    Returns recent text parsing sessions.
    """
    try:
        result = await db.execute(
            select(TextParsingHistory)
            .where(TextParsingHistory.user_id == current_user.id)
            .order_by(desc(TextParsingHistory.created_at))
            .limit(limit)
        )
        history_items = result.scalars().all()

        # Get total count
        count_result = await db.execute(
            select(TextParsingHistory)
            .where(TextParsingHistory.user_id == current_user.id)
        )
        total = len(count_result.scalars().all())

        return schemas.ParsingHistoryResponse(
            items=[schemas.ParsingHistoryItem.model_validate(item) for item in history_items],
            total=total,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get parsing history: {str(e)}",
        )
