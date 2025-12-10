"""
AI Module Schemas
Pydantic schemas for AI-related API requests and responses
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID


# Parsed grocery item
class ParsedGroceryItem(BaseModel):
    """A single parsed grocery item"""
    item_name: str
    quantity: Optional[float] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    expiry_date: Optional[str] = None  # YYYY-MM-DD format
    cost: Optional[float] = None
    store: Optional[str] = None


# Text Parsing Schemas
class ParseGroceryTextRequest(BaseModel):
    """Request to parse grocery text"""
    text: str = Field(..., min_length=1, max_length=10000, description="Free-form text containing grocery items")


class ParseGroceryTextResponse(BaseModel):
    """Response with parsed grocery items"""
    items: List[ParsedGroceryItem]
    total_count: int


# Categorization Schemas
class CategorizeItemRequest(BaseModel):
    """Request to categorize a single item"""
    item_name: str = Field(..., min_length=1, max_length=255)


class CategorizeItemResponse(BaseModel):
    """Response with suggested category"""
    item_name: str
    category: str


class BatchCategorizeRequest(BaseModel):
    """Request to categorize multiple items"""
    item_names: List[str] = Field(..., min_items=1, max_items=100)


class BatchCategorizeResponse(BaseModel):
    """Response with categories for all items"""
    categories: List[str]


# Category Correction Schemas
class CategoryCorrectionRequest(BaseModel):
    """Request to save a category correction"""
    item_name: str = Field(..., min_length=1, max_length=255)
    correct_category: str = Field(..., min_length=1, max_length=100)
    original_category: Optional[str] = None


class CategoryCorrectionResponse(BaseModel):
    """Response after saving correction"""
    message: str


# Parsing History Schemas
class ParsingHistoryItem(BaseModel):
    """A parsing history record"""
    id: UUID
    input_text: str
    items_count: int
    parsing_type: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ParsingHistoryResponse(BaseModel):
    """Response with parsing history"""
    items: List[ParsingHistoryItem]
    total: int
