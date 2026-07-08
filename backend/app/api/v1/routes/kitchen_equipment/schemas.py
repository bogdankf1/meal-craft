"""Kitchen equipment request/response schemas.

The kitchen equipment Pydantic models are defined centrally in
``app.schemas.kitchen_equipment``. This module re-exports them so the
kitchen_equipment package follows the same router / service / schemas layout as
the other feature packages, while keeping a single source of truth.
"""
from app.schemas.kitchen_equipment import (
    KitchenEquipmentCreate,
    KitchenEquipmentBatchCreate,
    KitchenEquipmentUpdate,
    KitchenEquipmentResponse,
    KitchenEquipmentListResponse,
    KitchenEquipmentFilters,
    BulkActionRequest,
    BulkActionResponse,
    KitchenEquipmentAnalytics,
    MaintenanceAnalytics,
    MaintenanceItem,
    EquipmentByCategory,
    EquipmentByCondition,
    EquipmentByLocation,
    KitchenEquipmentHistory,
    MonthlyEquipmentData,
    RecordMaintenanceRequest,
    BulkRecordMaintenanceRequest,
    ParseTextRequest,
    ParseTextResponse,
)

__all__ = [
    "KitchenEquipmentCreate",
    "KitchenEquipmentBatchCreate",
    "KitchenEquipmentUpdate",
    "KitchenEquipmentResponse",
    "KitchenEquipmentListResponse",
    "KitchenEquipmentFilters",
    "BulkActionRequest",
    "BulkActionResponse",
    "KitchenEquipmentAnalytics",
    "MaintenanceAnalytics",
    "MaintenanceItem",
    "EquipmentByCategory",
    "EquipmentByCondition",
    "EquipmentByLocation",
    "KitchenEquipmentHistory",
    "MonthlyEquipmentData",
    "RecordMaintenanceRequest",
    "BulkRecordMaintenanceRequest",
    "ParseTextRequest",
    "ParseTextResponse",
]
