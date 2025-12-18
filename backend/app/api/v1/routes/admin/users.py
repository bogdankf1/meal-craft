"""
Admin user management endpoints.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_admin_user
from app.models.user import User, UserRole, SubscriptionTier
from app.api.v1.routes.admin.service import AdminService
from app.api.v1.routes.admin.schemas import (
    UserBase,
    UserDetail,
    UserListResponse,
    UserUpdate,
    UserSuspend,
)

router = APIRouter(prefix="/users", tags=["Admin - Users"])


@router.get("", response_model=UserListResponse)
async def get_users(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by email or name"),
    role: Optional[UserRole] = Query(None, description="Filter by role"),
    tier: Optional[SubscriptionTier] = Query(None, description="Filter by subscription tier"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get paginated list of users with optional filters."""
    service = AdminService(db)
    users, total = await service.get_users(
        page=page,
        page_size=page_size,
        search=search,
        role=role,
        tier=tier,
    )
    return UserListResponse(
        users=users,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{user_id}", response_model=UserDetail)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get a specific user by ID."""
    service = AdminService(db)
    user = await service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


@router.patch("/{user_id}", response_model=UserDetail)
async def update_user(
    user_id: UUID,
    update_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Update user role, tier, or status."""
    service = AdminService(db)
    user = await service.update_user(
        user_id=user_id,
        role=update_data.role,
        subscription_tier=update_data.subscription_tier,
        is_active=update_data.is_active,
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


@router.post("/{user_id}/suspend", response_model=UserDetail)
async def suspend_user(
    user_id: UUID,
    suspend_data: Optional[UserSuspend] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Suspend a user account."""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot suspend your own account",
        )

    service = AdminService(db)
    reason = suspend_data.reason if suspend_data else None
    user = await service.suspend_user(user_id, reason)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


@router.post("/{user_id}/unsuspend", response_model=UserDetail)
async def unsuspend_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Unsuspend a user account."""
    service = AdminService(db)
    user = await service.unsuspend_user(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user
