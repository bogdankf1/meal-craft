from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter()


@router.get("")
async def list_groceries(db: AsyncSession = Depends(get_db)):
    """List groceries with filters."""
    # TODO: Implement with filtering, sorting, pagination
    return {"items": [], "total": 0, "page": 1, "per_page": 50}


@router.post("")
async def add_groceries(db: AsyncSession = Depends(get_db)):
    """Add grocery items."""
    # TODO: Implement grocery creation
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not yet implemented"
    )


@router.get("/{grocery_id}")
async def get_grocery(grocery_id: str, db: AsyncSession = Depends(get_db)):
    """Get single grocery item."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not yet implemented"
    )


@router.put("/{grocery_id}")
async def update_grocery(grocery_id: str, db: AsyncSession = Depends(get_db)):
    """Update grocery item."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not yet implemented"
    )


@router.delete("/{grocery_id}")
async def delete_grocery(grocery_id: str, db: AsyncSession = Depends(get_db)):
    """Delete grocery item."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Not yet implemented"
    )


@router.post("/parse-image")
async def parse_grocery_image(db: AsyncSession = Depends(get_db)):
    """Parse grocery items from image/receipt using OCR."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="OCR not yet implemented"
    )


@router.post("/parse-text")
async def parse_grocery_text(db: AsyncSession = Depends(get_db)):
    """Parse grocery items from text using AI."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Text parsing not yet implemented"
    )


@router.get("/analytics")
async def get_grocery_analytics(db: AsyncSession = Depends(get_db)):
    """Get grocery analytics data."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Analytics not yet implemented"
    )


@router.post("/bulk-archive")
async def bulk_archive_groceries(db: AsyncSession = Depends(get_db)):
    """Archive multiple grocery items."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Bulk archive not yet implemented"
    )


@router.post("/bulk-delete")
async def bulk_delete_groceries(db: AsyncSession = Depends(get_db)):
    """Delete multiple grocery items."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Bulk delete not yet implemented"
    )
