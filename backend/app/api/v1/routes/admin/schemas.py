"""
Admin API schemas.
"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, EmailStr

from app.models.user import UserRole, SubscriptionTier


# ==================== USER SCHEMAS ====================

class UserBase(BaseModel):
    id: UUID
    email: str
    name: Optional[str] = None
    role: UserRole
    subscription_tier: SubscriptionTier
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserDetail(UserBase):
    avatar_url: Optional[str] = None
    google_id: Optional[str] = None
    locale: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    updated_at: Optional[datetime] = None


class UserListResponse(BaseModel):
    users: List[UserBase]
    total: int
    page: int
    page_size: int


class UserUpdate(BaseModel):
    role: Optional[UserRole] = None
    subscription_tier: Optional[SubscriptionTier] = None
    is_active: Optional[bool] = None


class UserSuspend(BaseModel):
    reason: Optional[str] = None


# ==================== TIER SCHEMAS ====================

class TierBase(BaseModel):
    id: UUID
    name: str
    display_name: str
    price_monthly: Optional[float] = None
    features: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TierUpdate(BaseModel):
    display_name: Optional[str] = None
    price_monthly: Optional[float] = None
    features: Optional[dict] = None


class FeatureBase(BaseModel):
    id: UUID
    key: str
    name: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TierFeatureResponse(BaseModel):
    tier_id: UUID
    feature_id: UUID
    feature_key: str
    feature_name: str
    enabled: bool
    limit_value: Optional[int] = None

    class Config:
        from_attributes = True


class TierFeatureAssignment(BaseModel):
    feature_id: UUID
    enabled: bool = True
    limit_value: Optional[int] = None


# ==================== ANALYTICS SCHEMAS ====================

class PlatformStats(BaseModel):
    total_users: int
    active_users: int
    new_users_today: int
    new_users_this_week: int
    new_users_this_month: int
    total_subscriptions: int
    active_subscriptions: int
    mrr: float  # Monthly Recurring Revenue
    arr: float  # Annual Recurring Revenue
    churn_rate: float


class UserAcquisition(BaseModel):
    date: str
    count: int


class EngagementMetrics(BaseModel):
    dau: int  # Daily Active Users
    wau: int  # Weekly Active Users
    mau: int  # Monthly Active Users
    avg_session_duration: float  # in minutes
    retention_rate_30d: float  # 30-day retention rate


class ModuleUsageStats(BaseModel):
    module: str
    total_items: int
    active_users: int
    items_created_today: int
    items_created_this_week: int


class AnalyticsOverview(BaseModel):
    platform_stats: PlatformStats
    module_usage: List[ModuleUsageStats]


# ==================== CURRENCY SCHEMAS ====================

class CurrencyBase(BaseModel):
    id: UUID
    code: str
    name: str
    symbol: str
    decimal_places: int
    symbol_position: str
    exchange_rate: float
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CurrencyCreate(BaseModel):
    code: str  # ISO 4217, max 3 chars
    name: str
    symbol: str
    decimal_places: int = 2
    symbol_position: str = "before"  # "before" or "after"
    exchange_rate: float = 1.0
    is_active: bool = True


class CurrencyUpdate(BaseModel):
    name: Optional[str] = None
    symbol: Optional[str] = None
    decimal_places: Optional[int] = None
    symbol_position: Optional[str] = None
    exchange_rate: Optional[float] = None
    is_active: Optional[bool] = None
