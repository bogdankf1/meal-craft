"""Learning & Skills API routes."""

from datetime import datetime, date, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_
from dateutil.relativedelta import relativedelta

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.learning import (
    Skill,
    UserSkill,
    LearningPath,
    UserLearningPath,
    SkillPracticeLog,
    learning_path_skills,
)
from app.schemas.learning import (
    # Skill schemas
    SkillCreate,
    SkillUpdate,
    SkillResponse,
    SkillListResponse,
    SkillFilters,
    # User skill schemas
    UserSkillCreate,
    UserSkillUpdate,
    UserSkillResponse,
    UserSkillListResponse,
    UserSkillFilters,
    # Learning path schemas
    LearningPathCreate,
    LearningPathUpdate,
    LearningPathResponse,
    LearningPathListResponse,
    LearningPathFilters,
    # User learning path schemas
    UserLearningPathCreate,
    UserLearningPathUpdate,
    UserLearningPathResponse,
    UserLearningPathListResponse,
    # Practice log schemas
    SkillPracticeLogCreate,
    SkillPracticeLogResponse,
    SkillPracticeLogListResponse,
    PracticeLogFilters,
    # Bulk action schemas
    BulkSkillIds,
    BulkActionResponse,
    # Analytics schemas
    LearningAnalytics,
    SkillsByCategory,
    SkillsByProficiency,
    SkillsByStatus,
    RecentPractice,
    LearningStreak,
    # History schemas
    LearningHistory,
    MonthlyLearningData,
)

router = APIRouter(prefix="/learning", tags=["learning"])


# ============ Helper Functions ============

def _skill_to_response(skill: Skill, user_count: int = 0, is_added: bool = False) -> SkillResponse:
    """Convert skill model to response."""
    return SkillResponse(
        id=skill.id,
        name=skill.name,
        description=skill.description,
        category=skill.category,
        difficulty=skill.difficulty,
        video_url=skill.video_url,
        instructions=skill.instructions,
        tips=skill.tips,
        estimated_learning_hours=skill.estimated_learning_hours,
        prerequisites=skill.prerequisites,
        related_cuisines=skill.related_cuisines,
        is_active=skill.is_active,
        created_at=skill.created_at,
        updated_at=skill.updated_at,
        user_count=user_count,
        is_added=is_added,
    )


def _user_skill_to_response(user_skill: UserSkill, include_skill: bool = True) -> UserSkillResponse:
    """Convert user skill model to response."""
    skill_response = None
    if include_skill and user_skill.skill:
        skill_response = _skill_to_response(user_skill.skill)

    return UserSkillResponse(
        id=user_skill.id,
        user_id=user_skill.user_id,
        skill_id=user_skill.skill_id,
        proficiency_level=user_skill.proficiency_level,
        status=user_skill.status,
        progress_percent=user_skill.progress_percent,
        times_practiced=user_skill.times_practiced,
        total_practice_minutes=user_skill.total_practice_minutes,
        is_favorite=user_skill.is_favorite,
        notes=user_skill.notes,
        started_at=user_skill.started_at,
        last_practiced_at=user_skill.last_practiced_at,
        mastered_at=user_skill.mastered_at,
        created_at=user_skill.created_at,
        updated_at=user_skill.updated_at,
        skill=skill_response,
    )


def _learning_path_to_response(
    path: LearningPath,
    is_started: bool = False,
    user_progress_percent: int = 0
) -> LearningPathResponse:
    """Convert learning path model to response."""
    skills = [_skill_to_response(skill) for skill in path.skills] if path.skills else []

    return LearningPathResponse(
        id=path.id,
        name=path.name,
        description=path.description,
        category=path.category,
        difficulty=path.difficulty,
        estimated_hours=path.estimated_hours,
        skill_count=path.skill_count,
        image_url=path.image_url,
        is_active=path.is_active,
        is_featured=path.is_featured,
        created_at=path.created_at,
        updated_at=path.updated_at,
        skills=skills,
        is_started=is_started,
        user_progress_percent=user_progress_percent,
    )


def _practice_log_to_response(log: SkillPracticeLog, include_skill: bool = True) -> SkillPracticeLogResponse:
    """Convert practice log model to response."""
    skill_response = None
    if include_skill and log.skill:
        skill_response = _skill_to_response(log.skill)

    return SkillPracticeLogResponse(
        id=log.id,
        user_id=log.user_id,
        skill_id=log.skill_id,
        duration_minutes=log.duration_minutes,
        notes=log.notes,
        rating=log.rating,
        recipe_id=log.recipe_id,
        practiced_at=log.practiced_at,
        created_at=log.created_at,
        skill=skill_response,
    )


async def _update_learning_paths_progress(db: AsyncSession, user_id) -> None:
    """Update all user's learning paths progress based on mastered skills."""
    # Get all user's active learning paths
    user_paths_result = await db.execute(
        select(UserLearningPath).where(
            and_(
                UserLearningPath.user_id == user_id,
                UserLearningPath.status != "completed"
            )
        )
    )
    user_paths = user_paths_result.scalars().all()

    if not user_paths:
        return

    # Get all user's mastered skill IDs
    mastered_skills_result = await db.execute(
        select(UserSkill.skill_id).where(
            and_(
                UserSkill.user_id == user_id,
                UserSkill.status == "mastered"
            )
        )
    )
    mastered_skill_ids = set(row[0] for row in mastered_skills_result.fetchall())

    for user_path in user_paths:
        # Load the learning path with skills
        await db.refresh(user_path, ["learning_path"])
        if not user_path.learning_path:
            continue

        await db.refresh(user_path.learning_path, ["skills"])
        path_skills = user_path.learning_path.skills or []

        if not path_skills:
            continue

        # Count completed skills
        completed_count = sum(1 for skill in path_skills if skill.id in mastered_skill_ids)
        total_skills = len(path_skills)

        # Calculate progress
        progress_percent = int((completed_count / total_skills) * 100) if total_skills > 0 else 0

        # Find current skill index (first non-mastered skill)
        current_index = 0
        for i, skill in enumerate(path_skills):
            if skill.id not in mastered_skill_ids:
                current_index = i
                break
            current_index = i + 1  # All skills completed

        # Update user path
        user_path.skills_completed = completed_count
        user_path.progress_percent = progress_percent
        user_path.current_skill_index = current_index
        user_path.last_activity_at = datetime.utcnow()

        # Mark as completed if all skills are mastered
        if completed_count >= total_skills:
            user_path.status = "completed"
            user_path.completed_at = datetime.utcnow()

    await db.commit()


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
    query = select(Skill)

    # Apply filters
    if is_active is not None:
        query = query.where(Skill.is_active == is_active)

    if search:
        query = query.where(
            or_(
                Skill.name.ilike(f"%{search}%"),
                Skill.description.ilike(f"%{search}%")
            )
        )

    if category:
        query = query.where(Skill.category == category)

    if difficulty:
        query = query.where(Skill.difficulty == difficulty)

    # Sorting
    sort_column = getattr(Skill, sort_by, Skill.name)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    result = await db.execute(query)
    skills = result.scalars().all()

    # Get user's added skills to mark which ones are added
    user_skills_result = await db.execute(
        select(UserSkill.skill_id).where(UserSkill.user_id == current_user.id)
    )
    user_skill_ids = {row[0] for row in user_skills_result.all()}

    # Get user counts for each skill
    user_counts = {}
    for skill in skills:
        count_result = await db.execute(
            select(func.count()).where(UserSkill.skill_id == skill.id)
        )
        user_counts[skill.id] = count_result.scalar() or 0

    total_pages = (total + per_page - 1) // per_page

    return SkillListResponse(
        items=[
            _skill_to_response(
                skill,
                user_count=user_counts.get(skill.id, 0),
                is_added=skill.id in user_skill_ids
            )
            for skill in skills
        ],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get("/skills/{skill_id}", response_model=SkillResponse)
async def get_skill(
    skill_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single skill by ID."""
    result = await db.execute(
        select(Skill).where(Skill.id == skill_id)
    )
    skill = result.scalar_one_or_none()

    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found"
        )

    # Check if user has added this skill
    user_skill_result = await db.execute(
        select(UserSkill).where(
            and_(UserSkill.user_id == current_user.id, UserSkill.skill_id == skill_id)
        )
    )
    is_added = user_skill_result.scalar_one_or_none() is not None

    # Get user count
    count_result = await db.execute(
        select(func.count()).where(UserSkill.skill_id == skill_id)
    )
    user_count = count_result.scalar() or 0

    return _skill_to_response(skill, user_count=user_count, is_added=is_added)


@router.post("/skills", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
async def create_skill(
    skill_data: SkillCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new skill in the library (admin only in the future)."""
    skill = Skill(
        name=skill_data.name,
        description=skill_data.description,
        category=skill_data.category.value if skill_data.category else None,
        difficulty=skill_data.difficulty.value if skill_data.difficulty else "beginner",
        video_url=skill_data.video_url,
        instructions=skill_data.instructions,
        tips=skill_data.tips,
        estimated_learning_hours=skill_data.estimated_learning_hours,
        prerequisites=skill_data.prerequisites,
        related_cuisines=skill_data.related_cuisines,
    )

    db.add(skill)
    await db.commit()
    await db.refresh(skill)

    return _skill_to_response(skill)


@router.put("/skills/{skill_id}", response_model=SkillResponse)
async def update_skill(
    skill_id: UUID,
    skill_data: SkillUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a skill (admin only in the future)."""
    result = await db.execute(
        select(Skill).where(Skill.id == skill_id)
    )
    skill = result.scalar_one_or_none()

    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found"
        )

    update_data = skill_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in ["category", "difficulty"] and value:
            setattr(skill, field, value.value if hasattr(value, 'value') else value)
        else:
            setattr(skill, field, value)

    await db.commit()
    await db.refresh(skill)

    return _skill_to_response(skill)


@router.delete("/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill(
    skill_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a skill (admin only in the future)."""
    result = await db.execute(
        select(Skill).where(Skill.id == skill_id)
    )
    skill = result.scalar_one_or_none()

    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found"
        )

    await db.delete(skill)
    await db.commit()


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
    query = select(UserSkill).where(UserSkill.user_id == current_user.id)

    # Join with Skill for search and category filtering
    if search or category:
        query = query.join(Skill)

        if search:
            query = query.where(
                or_(
                    Skill.name.ilike(f"%{search}%"),
                    Skill.description.ilike(f"%{search}%")
                )
            )

        if category:
            query = query.where(Skill.category == category)

    # Apply user skill filters
    if proficiency_level:
        query = query.where(UserSkill.proficiency_level == proficiency_level)

    if user_status:
        query = query.where(UserSkill.status == user_status)

    if is_favorite is not None:
        query = query.where(UserSkill.is_favorite == is_favorite)

    # Sorting
    sort_column = getattr(UserSkill, sort_by, UserSkill.created_at)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    result = await db.execute(query)
    user_skills = result.scalars().all()

    # Load skills for each user skill
    for us in user_skills:
        await db.refresh(us, ["skill"])

    total_pages = (total + per_page - 1) // per_page

    return UserSkillListResponse(
        items=[_user_skill_to_response(us) for us in user_skills],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.post("/my-skills", response_model=UserSkillResponse, status_code=status.HTTP_201_CREATED)
async def add_user_skill(
    skill_data: UserSkillCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a skill to user's list."""
    # Check if skill exists
    skill_result = await db.execute(
        select(Skill).where(Skill.id == skill_data.skill_id)
    )
    skill = skill_result.scalar_one_or_none()

    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found"
        )

    # Check if user already has this skill
    existing_result = await db.execute(
        select(UserSkill).where(
            and_(
                UserSkill.user_id == current_user.id,
                UserSkill.skill_id == skill_data.skill_id
            )
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skill already added to your list"
        )

    user_skill = UserSkill(
        user_id=current_user.id,
        skill_id=skill_data.skill_id,
        proficiency_level=skill_data.proficiency_level.value if skill_data.proficiency_level else "beginner",
        status=skill_data.status.value if skill_data.status else "want_to_learn",
        is_favorite=skill_data.is_favorite or False,
        notes=skill_data.notes,
    )

    db.add(user_skill)
    await db.commit()
    await db.refresh(user_skill, ["skill"])

    return _user_skill_to_response(user_skill)


@router.post("/my-skills/bulk-add", response_model=BulkActionResponse)
async def bulk_add_skills(
    request: BulkSkillIds,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add multiple skills to user's list."""
    # Get existing user skills
    existing_result = await db.execute(
        select(UserSkill.skill_id).where(
            and_(
                UserSkill.user_id == current_user.id,
                UserSkill.skill_id.in_(request.skill_ids)
            )
        )
    )
    existing_skill_ids = {row[0] for row in existing_result.all()}

    # Filter out already added skills
    new_skill_ids = [sid for sid in request.skill_ids if sid not in existing_skill_ids]

    if not new_skill_ids:
        return BulkActionResponse(
            success=True,
            affected_count=0,
            message="All skills already added to your list"
        )

    # Add new skills
    for skill_id in new_skill_ids:
        user_skill = UserSkill(
            user_id=current_user.id,
            skill_id=skill_id,
            proficiency_level="beginner",
            status="want_to_learn",
        )
        db.add(user_skill)

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=len(new_skill_ids),
        message=f"Successfully added {len(new_skill_ids)} skill(s) to your list"
    )


@router.get("/my-skills/{user_skill_id}", response_model=UserSkillResponse)
async def get_user_skill(
    user_skill_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a user skill by ID."""
    result = await db.execute(
        select(UserSkill).where(
            and_(UserSkill.id == user_skill_id, UserSkill.user_id == current_user.id)
        )
    )
    user_skill = result.scalar_one_or_none()

    if not user_skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User skill not found"
        )

    await db.refresh(user_skill, ["skill"])
    return _user_skill_to_response(user_skill)


@router.put("/my-skills/{user_skill_id}", response_model=UserSkillResponse)
async def update_user_skill(
    user_skill_id: UUID,
    skill_data: UserSkillUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a user skill."""
    result = await db.execute(
        select(UserSkill).where(
            and_(UserSkill.id == user_skill_id, UserSkill.user_id == current_user.id)
        )
    )
    user_skill = result.scalar_one_or_none()

    if not user_skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User skill not found"
        )

    update_data = skill_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in ["proficiency_level", "status"] and value:
            setattr(user_skill, field, value.value if hasattr(value, 'value') else value)
        else:
            setattr(user_skill, field, value)

    # If status is mastered, set mastered_at
    if skill_data.status and skill_data.status.value == "mastered" and not user_skill.mastered_at:
        user_skill.mastered_at = datetime.utcnow()
        user_skill.progress_percent = 100

    await db.commit()
    await db.refresh(user_skill, ["skill"])

    # Update learning path progress if this skill is part of any user's active paths
    await _update_learning_paths_progress(db, current_user.id)

    return _user_skill_to_response(user_skill)


@router.delete("/my-skills/{user_skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_user_skill(
    user_skill_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a skill from user's list."""
    result = await db.execute(
        select(UserSkill).where(
            and_(UserSkill.id == user_skill_id, UserSkill.user_id == current_user.id)
        )
    )
    user_skill = result.scalar_one_or_none()

    if not user_skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User skill not found"
        )

    await db.delete(user_skill)
    await db.commit()


@router.post("/my-skills/bulk-remove", response_model=BulkActionResponse)
async def bulk_remove_skills(
    request: BulkSkillIds,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove multiple skills from user's list."""
    result = await db.execute(
        select(UserSkill).where(
            and_(
                UserSkill.skill_id.in_(request.skill_ids),
                UserSkill.user_id == current_user.id
            )
        )
    )
    user_skills = result.scalars().all()

    if not user_skills:
        return BulkActionResponse(
            success=False,
            affected_count=0,
            message="No matching skills found"
        )

    count = len(user_skills)
    for us in user_skills:
        await db.delete(us)

    await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=count,
        message=f"Successfully removed {count} skill(s) from your list"
    )


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
    query = select(LearningPath)

    if is_active is not None:
        query = query.where(LearningPath.is_active == is_active)

    if search:
        query = query.where(
            or_(
                LearningPath.name.ilike(f"%{search}%"),
                LearningPath.description.ilike(f"%{search}%")
            )
        )

    if category:
        query = query.where(LearningPath.category == category)

    if difficulty:
        query = query.where(LearningPath.difficulty == difficulty)

    if is_featured is not None:
        query = query.where(LearningPath.is_featured == is_featured)

    # Sorting
    sort_column = getattr(LearningPath, sort_by, LearningPath.name)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    result = await db.execute(query)
    paths = result.scalars().all()

    # Get user's started paths
    user_paths_result = await db.execute(
        select(UserLearningPath).where(UserLearningPath.user_id == current_user.id)
    )
    user_paths = {up.learning_path_id: up for up in user_paths_result.scalars().all()}

    total_pages = (total + per_page - 1) // per_page

    items = []
    for path in paths:
        await db.refresh(path, ["skills"])
        user_path = user_paths.get(path.id)
        items.append(_learning_path_to_response(
            path,
            is_started=user_path is not None,
            user_progress_percent=user_path.progress_percent if user_path else 0
        ))

    return LearningPathListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get("/paths/{path_id}", response_model=LearningPathResponse)
async def get_learning_path(
    path_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a learning path by ID."""
    result = await db.execute(
        select(LearningPath).where(LearningPath.id == path_id)
    )
    path = result.scalar_one_or_none()

    if not path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning path not found"
        )

    await db.refresh(path, ["skills"])

    # Check if user has started this path
    user_path_result = await db.execute(
        select(UserLearningPath).where(
            and_(
                UserLearningPath.user_id == current_user.id,
                UserLearningPath.learning_path_id == path_id
            )
        )
    )
    user_path = user_path_result.scalar_one_or_none()

    return _learning_path_to_response(
        path,
        is_started=user_path is not None,
        user_progress_percent=user_path.progress_percent if user_path else 0
    )


@router.post("/paths", response_model=LearningPathResponse, status_code=status.HTTP_201_CREATED)
async def create_learning_path(
    path_data: LearningPathCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new learning path (admin only in the future)."""
    # Verify all skills exist
    skills_result = await db.execute(
        select(Skill).where(Skill.id.in_(path_data.skill_ids))
    )
    skills = skills_result.scalars().all()

    if len(skills) != len(path_data.skill_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more skills not found"
        )

    path = LearningPath(
        name=path_data.name,
        description=path_data.description,
        category=path_data.category.value if path_data.category else None,
        difficulty=path_data.difficulty.value if path_data.difficulty else "beginner",
        estimated_hours=path_data.estimated_hours,
        image_url=path_data.image_url,
        skill_count=len(path_data.skill_ids),
    )

    # Add skills in order
    skill_map = {s.id: s for s in skills}
    path.skills = [skill_map[sid] for sid in path_data.skill_ids if sid in skill_map]

    db.add(path)
    await db.commit()
    await db.refresh(path, ["skills"])

    return _learning_path_to_response(path)


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
    query = select(UserLearningPath).where(UserLearningPath.user_id == current_user.id)

    if user_status:
        query = query.where(UserLearningPath.status == user_status)

    query = query.order_by(UserLearningPath.last_activity_at.desc().nullslast())

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    result = await db.execute(query)
    user_paths = result.scalars().all()

    # Load learning paths
    items = []
    for up in user_paths:
        await db.refresh(up, ["learning_path"])
        if up.learning_path:
            await db.refresh(up.learning_path, ["skills"])

        path_response = _learning_path_to_response(
            up.learning_path,
            is_started=True,
            user_progress_percent=up.progress_percent
        ) if up.learning_path else None

        items.append(UserLearningPathResponse(
            id=up.id,
            user_id=up.user_id,
            learning_path_id=up.learning_path_id,
            status=up.status,
            progress_percent=up.progress_percent,
            skills_completed=up.skills_completed,
            current_skill_index=up.current_skill_index,
            started_at=up.started_at,
            completed_at=up.completed_at,
            last_activity_at=up.last_activity_at,
            created_at=up.created_at,
            updated_at=up.updated_at,
            learning_path=path_response,
        ))

    total_pages = (total + per_page - 1) // per_page

    return UserLearningPathListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.post("/my-paths", response_model=UserLearningPathResponse, status_code=status.HTTP_201_CREATED)
async def start_learning_path(
    path_data: UserLearningPathCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start a learning path."""
    # Check if path exists
    path_result = await db.execute(
        select(LearningPath).where(LearningPath.id == path_data.learning_path_id)
    )
    path = path_result.scalar_one_or_none()

    if not path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning path not found"
        )

    # Check if user already started this path
    existing_result = await db.execute(
        select(UserLearningPath).where(
            and_(
                UserLearningPath.user_id == current_user.id,
                UserLearningPath.learning_path_id == path_data.learning_path_id
            )
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already started this learning path"
        )

    user_path = UserLearningPath(
        user_id=current_user.id,
        learning_path_id=path_data.learning_path_id,
        status="in_progress",
        started_at=datetime.utcnow(),
        last_activity_at=datetime.utcnow(),
    )

    db.add(user_path)
    await db.commit()
    await db.refresh(user_path, ["learning_path"])
    await db.refresh(user_path.learning_path, ["skills"])

    path_response = _learning_path_to_response(
        user_path.learning_path,
        is_started=True,
        user_progress_percent=0
    )

    return UserLearningPathResponse(
        id=user_path.id,
        user_id=user_path.user_id,
        learning_path_id=user_path.learning_path_id,
        status=user_path.status,
        progress_percent=user_path.progress_percent,
        skills_completed=user_path.skills_completed,
        current_skill_index=user_path.current_skill_index,
        started_at=user_path.started_at,
        completed_at=user_path.completed_at,
        last_activity_at=user_path.last_activity_at,
        created_at=user_path.created_at,
        updated_at=user_path.updated_at,
        learning_path=path_response,
    )


@router.post("/my-paths/{learning_path_id}/add-all-skills", response_model=BulkActionResponse)
async def add_all_path_skills_to_user(
    learning_path_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add all skills from a learning path to user's skills."""
    # Get the learning path with skills
    path_result = await db.execute(
        select(LearningPath).where(LearningPath.id == learning_path_id)
    )
    path = path_result.scalar_one_or_none()

    if not path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning path not found"
        )

    await db.refresh(path, ["skills"])

    if not path.skills:
        return BulkActionResponse(
            success=True,
            affected_count=0,
            message="No skills in this learning path"
        )

    # Get user's existing skill IDs
    existing_skills_result = await db.execute(
        select(UserSkill.skill_id).where(UserSkill.user_id == current_user.id)
    )
    existing_skill_ids = set(row[0] for row in existing_skills_result.fetchall())

    # Add skills that user doesn't have yet
    added_count = 0
    for skill in path.skills:
        if skill.id not in existing_skill_ids:
            user_skill = UserSkill(
                user_id=current_user.id,
                skill_id=skill.id,
                status="want_to_learn",
                proficiency_level="beginner",
            )
            db.add(user_skill)
            added_count += 1

    if added_count > 0:
        await db.commit()

    return BulkActionResponse(
        success=True,
        affected_count=added_count,
        message=f"Added {added_count} skills to your list"
    )


@router.put("/my-paths/{user_path_id}", response_model=UserLearningPathResponse)
async def update_user_learning_path(
    user_path_id: UUID,
    path_data: UserLearningPathUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update user's learning path progress."""
    result = await db.execute(
        select(UserLearningPath).where(
            and_(UserLearningPath.id == user_path_id, UserLearningPath.user_id == current_user.id)
        )
    )
    user_path = result.scalar_one_or_none()

    if not user_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User learning path not found"
        )

    update_data = path_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "status" and value:
            setattr(user_path, field, value.value if hasattr(value, 'value') else value)
        else:
            setattr(user_path, field, value)

    user_path.last_activity_at = datetime.utcnow()

    # If completed, set completed_at
    if path_data.status and path_data.status.value == "completed" and not user_path.completed_at:
        user_path.completed_at = datetime.utcnow()
        user_path.progress_percent = 100

    await db.commit()
    await db.refresh(user_path, ["learning_path"])
    await db.refresh(user_path.learning_path, ["skills"])

    path_response = _learning_path_to_response(
        user_path.learning_path,
        is_started=True,
        user_progress_percent=user_path.progress_percent
    )

    return UserLearningPathResponse(
        id=user_path.id,
        user_id=user_path.user_id,
        learning_path_id=user_path.learning_path_id,
        status=user_path.status,
        progress_percent=user_path.progress_percent,
        skills_completed=user_path.skills_completed,
        current_skill_index=user_path.current_skill_index,
        started_at=user_path.started_at,
        completed_at=user_path.completed_at,
        last_activity_at=user_path.last_activity_at,
        created_at=user_path.created_at,
        updated_at=user_path.updated_at,
        learning_path=path_response,
    )


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
    query = select(SkillPracticeLog).where(SkillPracticeLog.user_id == current_user.id)

    if skill_id:
        query = query.where(SkillPracticeLog.skill_id == skill_id)

    if date_from:
        query = query.where(SkillPracticeLog.practiced_at >= date_from)

    if date_to:
        query = query.where(SkillPracticeLog.practiced_at <= date_to)

    # Sorting
    sort_column = getattr(SkillPracticeLog, sort_by, SkillPracticeLog.practiced_at)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    result = await db.execute(query)
    logs = result.scalars().all()

    # Load skills
    for log in logs:
        await db.refresh(log, ["skill"])

    total_pages = (total + per_page - 1) // per_page

    return SkillPracticeLogListResponse(
        items=[_practice_log_to_response(log) for log in logs],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.post("/practice-logs", response_model=SkillPracticeLogResponse, status_code=status.HTTP_201_CREATED)
async def log_practice(
    log_data: SkillPracticeLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Log a practice session for a skill."""
    # Check if user has this skill
    user_skill_result = await db.execute(
        select(UserSkill).where(
            and_(
                UserSkill.user_id == current_user.id,
                UserSkill.skill_id == log_data.skill_id
            )
        )
    )
    user_skill = user_skill_result.scalar_one_or_none()

    if not user_skill:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must add this skill to your list before logging practice"
        )

    practice_log = SkillPracticeLog(
        user_id=current_user.id,
        skill_id=log_data.skill_id,
        duration_minutes=log_data.duration_minutes,
        notes=log_data.notes,
        rating=log_data.rating,
        recipe_id=log_data.recipe_id,
        practiced_at=log_data.practiced_at or datetime.utcnow(),
    )

    db.add(practice_log)

    # Update user skill stats
    user_skill.times_practiced += 1
    if log_data.duration_minutes:
        user_skill.total_practice_minutes += log_data.duration_minutes
    user_skill.last_practiced_at = datetime.utcnow()

    # Update status if it was "want_to_learn"
    if user_skill.status == "want_to_learn":
        user_skill.status = "learning"

    await db.commit()
    await db.refresh(practice_log, ["skill"])

    return _practice_log_to_response(practice_log)


# ============ Analytics ============

@router.get("/analytics", response_model=LearningAnalytics)
async def get_learning_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get learning analytics overview."""
    # Get all user skills
    user_skills_result = await db.execute(
        select(UserSkill).where(UserSkill.user_id == current_user.id)
    )
    user_skills = user_skills_result.scalars().all()

    # Load skill details
    for us in user_skills:
        await db.refresh(us, ["skill"])

    total_skills = len(user_skills)
    skills_mastered = sum(1 for us in user_skills if us.status == "mastered")
    skills_learning = sum(1 for us in user_skills if us.status in ["learning", "practicing"])
    skills_want_to_learn = sum(1 for us in user_skills if us.status == "want_to_learn")

    total_practice_minutes = sum(us.total_practice_minutes for us in user_skills)
    total_practice_hours = total_practice_minutes / 60

    # By category
    category_count = {}
    for us in user_skills:
        cat = us.skill.category if us.skill else "other"
        cat = cat or "other"
        category_count[cat] = category_count.get(cat, 0) + 1
    by_category = [
        SkillsByCategory(category=cat, count=count)
        for cat, count in sorted(category_count.items(), key=lambda x: x[1], reverse=True)
    ]

    # By proficiency
    proficiency_count = {}
    for us in user_skills:
        prof = us.proficiency_level or "beginner"
        proficiency_count[prof] = proficiency_count.get(prof, 0) + 1
    by_proficiency = [
        SkillsByProficiency(proficiency_level=prof, count=count)
        for prof, count in proficiency_count.items()
    ]

    # By status
    status_count = {}
    for us in user_skills:
        st = us.status or "want_to_learn"
        status_count[st] = status_count.get(st, 0) + 1
    by_status = [
        SkillsByStatus(status=st, count=count)
        for st, count in status_count.items()
    ]

    # Recent practice
    practice_logs_result = await db.execute(
        select(SkillPracticeLog)
        .where(SkillPracticeLog.user_id == current_user.id)
        .order_by(SkillPracticeLog.practiced_at.desc())
        .limit(10)
    )
    practice_logs = practice_logs_result.scalars().all()

    total_practice_sessions = await db.execute(
        select(func.count()).where(SkillPracticeLog.user_id == current_user.id)
    )
    total_sessions = total_practice_sessions.scalar() or 0

    recent_practice = []
    for log in practice_logs:
        await db.refresh(log, ["skill"])
        recent_practice.append(RecentPractice(
            skill_id=log.skill_id,
            skill_name=log.skill.name if log.skill else "Unknown",
            practiced_at=log.practiced_at,
            duration_minutes=log.duration_minutes,
            rating=log.rating,
        ))

    # Learning streak (consecutive days with practice)
    today = date.today()
    current_streak = 0
    longest_streak = 0
    last_practice_date = None

    if practice_logs:
        last_practice_date = practice_logs[0].practiced_at

        # Get unique practice dates
        all_logs_result = await db.execute(
            select(func.date(SkillPracticeLog.practiced_at).label("practice_date"))
            .where(SkillPracticeLog.user_id == current_user.id)
            .distinct()
            .order_by(func.date(SkillPracticeLog.practiced_at).desc())
        )
        practice_dates = [row[0] for row in all_logs_result.all()]

        if practice_dates:
            # Calculate current streak
            check_date = today
            for practice_date in practice_dates:
                if practice_date == check_date or practice_date == check_date - timedelta(days=1):
                    current_streak += 1
                    check_date = practice_date - timedelta(days=1)
                else:
                    break

            # Calculate longest streak
            streak = 1
            for i in range(1, len(practice_dates)):
                if practice_dates[i-1] - practice_dates[i] == timedelta(days=1):
                    streak += 1
                else:
                    longest_streak = max(longest_streak, streak)
                    streak = 1
            longest_streak = max(longest_streak, streak, current_streak)

    learning_streak = LearningStreak(
        current_streak_days=current_streak,
        longest_streak_days=longest_streak,
        last_practice_date=last_practice_date,
    )

    # Learning paths
    paths_result = await db.execute(
        select(UserLearningPath).where(UserLearningPath.user_id == current_user.id)
    )
    user_paths = paths_result.scalars().all()
    paths_in_progress = sum(1 for up in user_paths if up.status == "in_progress")
    paths_completed = sum(1 for up in user_paths if up.status == "completed")

    # Average practice rating
    avg_rating_result = await db.execute(
        select(func.avg(SkillPracticeLog.rating))
        .where(
            and_(
                SkillPracticeLog.user_id == current_user.id,
                SkillPracticeLog.rating.isnot(None)
            )
        )
    )
    avg_rating = avg_rating_result.scalar()

    return LearningAnalytics(
        total_skills=total_skills,
        skills_mastered=skills_mastered,
        skills_learning=skills_learning,
        skills_want_to_learn=skills_want_to_learn,
        total_practice_hours=round(total_practice_hours, 1),
        total_practice_sessions=total_sessions,
        by_category=by_category,
        by_proficiency=by_proficiency,
        by_status=by_status,
        recent_practice=recent_practice,
        learning_streak=learning_streak,
        paths_in_progress=paths_in_progress,
        paths_completed=paths_completed,
        avg_practice_rating=round(avg_rating, 1) if avg_rating else None,
    )


# ============ History ============

@router.get("/history", response_model=LearningHistory)
async def get_learning_history(
    months: int = Query(3, ge=1, le=24, description="Number of months to analyze"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get learning history data."""
    today = date.today()
    start_date = today - relativedelta(months=months)

    # Get skills added in period
    skills_result = await db.execute(
        select(UserSkill)
        .where(
            and_(
                UserSkill.user_id == current_user.id,
                UserSkill.created_at >= start_date
            )
        )
        .order_by(UserSkill.created_at.desc())
    )
    all_skills = skills_result.scalars().all()

    for us in all_skills:
        await db.refresh(us, ["skill"])

    # Get practice logs in period
    logs_result = await db.execute(
        select(SkillPracticeLog)
        .where(
            and_(
                SkillPracticeLog.user_id == current_user.id,
                SkillPracticeLog.practiced_at >= start_date
            )
        )
    )
    all_logs = logs_result.scalars().all()

    total_skills_added = len(all_skills)
    total_skills_mastered = sum(1 for us in all_skills if us.mastered_at and us.mastered_at >= datetime.combine(start_date, datetime.min.time()))
    total_practice_sessions = len(all_logs)
    total_practice_minutes = sum(log.duration_minutes or 0 for log in all_logs)
    total_practice_hours = total_practice_minutes / 60
    avg_monthly_practice_hours = total_practice_hours / months if months > 0 else 0

    # Monthly data
    monthly_data = []
    current_month = today.replace(day=1)
    mastery_trend = {}

    for i in range(months):
        month_start = current_month - relativedelta(months=i)
        month_end = month_start + relativedelta(months=1) - timedelta(days=1)
        month_key = month_start.strftime("%Y-%m")
        month_label = month_start.strftime("%b %Y")

        month_skills = [
            us for us in all_skills
            if month_start <= us.created_at.date() <= month_end
        ]

        month_mastered = sum(
            1 for us in all_skills
            if us.mastered_at and month_start <= us.mastered_at.date() <= month_end
        )

        month_logs = [
            log for log in all_logs
            if month_start <= log.practiced_at.date() <= month_end
        ]

        category_breakdown = {}
        for us in month_skills:
            cat = us.skill.category if us.skill else "other"
            cat = cat or "other"
            category_breakdown[cat] = category_breakdown.get(cat, 0) + 1

        month_practice_minutes = sum(log.duration_minutes or 0 for log in month_logs)

        monthly_data.append(MonthlyLearningData(
            month=month_key,
            month_label=month_label,
            skills_added=len(month_skills),
            skills_mastered=month_mastered,
            practice_sessions=len(month_logs),
            practice_minutes=month_practice_minutes,
            category_breakdown=category_breakdown,
        ))

        mastery_trend[month_key] = month_mastered

    monthly_data.reverse()

    return LearningHistory(
        period_months=months,
        total_skills_added=total_skills_added,
        total_skills_mastered=total_skills_mastered,
        total_practice_sessions=total_practice_sessions,
        total_practice_hours=round(total_practice_hours, 1),
        avg_monthly_practice_hours=round(avg_monthly_practice_hours, 1),
        monthly_data=monthly_data,
        mastery_trend=mastery_trend,
    )
