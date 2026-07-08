"""Learning & Skills API routes.

Thin route handlers: validate the request (via the FastAPI signature) and
delegate to ``service``. Ownership lookups and pagination live in the service
layer via ``get_owned_or_404`` / ``paginate``.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.api.v1.routes.learning import service
from app.api.v1.routes.learning.schemas import (
    SkillCreate,
    SkillUpdate,
    SkillResponse,
    SkillListResponse,
    UserSkillCreate,
    UserSkillUpdate,
    UserSkillResponse,
    UserSkillListResponse,
    LearningPathCreate,
    LearningPathResponse,
    LearningPathListResponse,
    UserLearningPathCreate,
    UserLearningPathUpdate,
    UserLearningPathResponse,
    UserLearningPathListResponse,
    SkillPracticeLogCreate,
    SkillPracticeLogResponse,
    SkillPracticeLogListResponse,
    BulkSkillIds,
    BulkActionResponse,
    LearningAnalytics,
    LearningHistory,
)

router = APIRouter(prefix="/learning", tags=["learning"])


# ============ Skills Library CRUD ============

@router.get("/skills", response_model=SkillListResponse)
async def list_skills(
    search: Optional[str] = None,
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    is_active: Optional[bool] = True,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = "name",
    sort_order: str = "asc",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List skills from the library with filters and pagination."""
    return await service.list_skills(
        db,
        current_user,
        search=search,
        category=category,
        difficulty=difficulty,
        is_active=is_active,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/skills/{skill_id}", response_model=SkillResponse)
async def get_skill(
    skill_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single skill by ID."""
    return await service.get_skill(db, current_user, skill_id)


@router.post("/skills", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
async def create_skill(
    skill_data: SkillCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new skill in the library (admin only in the future)."""
    return await service.create_skill(db, current_user, skill_data)


@router.put("/skills/{skill_id}", response_model=SkillResponse)
async def update_skill(
    skill_id: UUID,
    skill_data: SkillUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a skill (admin only in the future)."""
    return await service.update_skill(db, current_user, skill_id, skill_data)


@router.delete("/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill(
    skill_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a skill (admin only in the future)."""
    await service.delete_skill(db, current_user, skill_id)


# ============ User Skills (My Skills) ============

@router.get("/my-skills", response_model=UserSkillListResponse)
async def list_user_skills(
    search: Optional[str] = None,
    category: Optional[str] = None,
    proficiency_level: Optional[str] = None,
    user_status: Optional[str] = Query(None, alias="status"),
    is_favorite: Optional[bool] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List user's skills with filters and pagination."""
    return await service.list_user_skills(
        db,
        current_user,
        search=search,
        category=category,
        proficiency_level=proficiency_level,
        user_status=user_status,
        is_favorite=is_favorite,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.post("/my-skills", response_model=UserSkillResponse, status_code=status.HTTP_201_CREATED)
async def add_user_skill(
    skill_data: UserSkillCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a skill to user's list."""
    return await service.add_user_skill(db, current_user, skill_data)


@router.post("/my-skills/bulk-add", response_model=BulkActionResponse)
async def bulk_add_skills(
    request: BulkSkillIds,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add multiple skills to user's list."""
    return await service.bulk_add_skills(db, current_user, request)


@router.get("/my-skills/{user_skill_id}", response_model=UserSkillResponse)
async def get_user_skill(
    user_skill_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a user skill by ID."""
    return await service.get_user_skill(db, current_user, user_skill_id)


@router.put("/my-skills/{user_skill_id}", response_model=UserSkillResponse)
async def update_user_skill(
    user_skill_id: UUID,
    skill_data: UserSkillUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a user skill."""
    return await service.update_user_skill(db, current_user, user_skill_id, skill_data)


@router.delete("/my-skills/{user_skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_user_skill(
    user_skill_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a skill from user's list."""
    await service.remove_user_skill(db, current_user, user_skill_id)


@router.post("/my-skills/bulk-remove", response_model=BulkActionResponse)
async def bulk_remove_skills(
    request: BulkSkillIds,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove multiple skills from user's list."""
    return await service.bulk_remove_skills(db, current_user, request)


# ============ Learning Paths ============

@router.get("/paths", response_model=LearningPathListResponse)
async def list_learning_paths(
    search: Optional[str] = None,
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    is_featured: Optional[bool] = None,
    is_active: Optional[bool] = True,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = "name",
    sort_order: str = "asc",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List learning paths with filters and pagination."""
    return await service.list_learning_paths(
        db,
        current_user,
        search=search,
        category=category,
        difficulty=difficulty,
        is_featured=is_featured,
        is_active=is_active,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/paths/{path_id}", response_model=LearningPathResponse)
async def get_learning_path(
    path_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a learning path by ID."""
    return await service.get_learning_path(db, current_user, path_id)


@router.post("/paths", response_model=LearningPathResponse, status_code=status.HTTP_201_CREATED)
async def create_learning_path(
    path_data: LearningPathCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new learning path (admin only in the future)."""
    return await service.create_learning_path(db, current_user, path_data)


# ============ User Learning Paths ============

@router.get("/my-paths", response_model=UserLearningPathListResponse)
async def list_user_learning_paths(
    user_status: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List user's learning paths with progress."""
    return await service.list_user_learning_paths(
        db,
        current_user,
        user_status=user_status,
        page=page,
        per_page=per_page,
    )


@router.post("/my-paths", response_model=UserLearningPathResponse, status_code=status.HTTP_201_CREATED)
async def start_learning_path(
    path_data: UserLearningPathCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start a learning path."""
    return await service.start_learning_path(db, current_user, path_data)


@router.post("/my-paths/{learning_path_id}/add-all-skills", response_model=BulkActionResponse)
async def add_all_path_skills_to_user(
    learning_path_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add all skills from a learning path to user's skills."""
    return await service.add_all_path_skills_to_user(db, current_user, learning_path_id)


@router.put("/my-paths/{user_path_id}", response_model=UserLearningPathResponse)
async def update_user_learning_path(
    user_path_id: UUID,
    path_data: UserLearningPathUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update user's learning path progress."""
    return await service.update_user_learning_path(db, current_user, user_path_id, path_data)


# ============ Practice Logs ============

@router.get("/practice-logs", response_model=SkillPracticeLogListResponse)
async def list_practice_logs(
    skill_id: Optional[UUID] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = "practiced_at",
    sort_order: str = "desc",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List user's practice logs with filters."""
    return await service.list_practice_logs(
        db,
        current_user,
        skill_id=skill_id,
        date_from=date_from,
        date_to=date_to,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.post("/practice-logs", response_model=SkillPracticeLogResponse, status_code=status.HTTP_201_CREATED)
async def log_practice(
    log_data: SkillPracticeLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Log a practice session for a skill."""
    return await service.log_practice(db, current_user, log_data)


# ============ Analytics ============

@router.get("/analytics", response_model=LearningAnalytics)
async def get_learning_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get learning analytics overview."""
    return await service.get_learning_analytics(db, current_user)


# ============ History ============

@router.get("/history", response_model=LearningHistory)
async def get_learning_history(
    months: int = Query(3, ge=1, le=24, description="Number of months to analyze"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get learning history data."""
    return await service.get_learning_history(db, current_user, months=months)
