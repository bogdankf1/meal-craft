"""Learning & Skills Schemas"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field


# ============ Enums ============

class SkillCategory(str, Enum):
    """Skill category enum."""
    KNIFE_SKILLS = "knife_skills"
    COOKING_METHODS = "cooking_methods"
    BAKING = "baking"
    SAUCES = "sauces"
    PRESERVATION = "preservation"
    PLATING = "plating"
    TEMPERATURE_CONTROL = "temperature_control"
    PREP_TECHNIQUES = "prep_techniques"
    FLAVOR_DEVELOPMENT = "flavor_development"
    EQUIPMENT_HANDLING = "equipment_handling"
    OTHER = "other"


class SkillDifficulty(str, Enum):
    """Skill difficulty enum."""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class ProficiencyLevel(str, Enum):
    """User's proficiency level enum."""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    MASTERED = "mastered"


class UserSkillStatus(str, Enum):
    """User's skill status enum."""
    WANT_TO_LEARN = "want_to_learn"
    LEARNING = "learning"
    PRACTICING = "practicing"
    MASTERED = "mastered"


class LearningPathStatus(str, Enum):
    """Learning path status enum."""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class LearningPathCategory(str, Enum):
    """Learning path category enum."""
    FUNDAMENTALS = "fundamentals"
    CUISINE_SPECIFIC = "cuisine_specific"
    ADVANCED_TECHNIQUES = "advanced_techniques"
    SPECIALTY = "specialty"


# ============ Skill Schemas ============

class SkillBase(BaseModel):
    """Base schema for skill."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[SkillCategory] = None
    difficulty: Optional[SkillDifficulty] = SkillDifficulty.BEGINNER
    video_url: Optional[str] = Field(None, max_length=500)
    instructions: Optional[str] = None
    tips: Optional[str] = None
    estimated_learning_hours: Optional[int] = Field(None, ge=1)
    prerequisites: Optional[List[UUID]] = None
    related_cuisines: Optional[List[str]] = None


class SkillCreate(SkillBase):
    """Schema for creating a skill."""
    pass


class SkillUpdate(BaseModel):
    """Schema for updating a skill."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[SkillCategory] = None
    difficulty: Optional[SkillDifficulty] = None
    video_url: Optional[str] = Field(None, max_length=500)
    instructions: Optional[str] = None
    tips: Optional[str] = None
    estimated_learning_hours: Optional[int] = Field(None, ge=1)
    prerequisites: Optional[List[UUID]] = None
    related_cuisines: Optional[List[str]] = None
    is_active: Optional[bool] = None


class SkillResponse(BaseModel):
    """Schema for skill response."""
    id: UUID
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    video_url: Optional[str] = None
    instructions: Optional[str] = None
    tips: Optional[str] = None
    estimated_learning_hours: Optional[int] = None
    prerequisites: Optional[List[UUID]] = None
    related_cuisines: Optional[List[str]] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    # Computed fields (populated by API)
    user_count: int = 0  # Number of users learning this skill
    is_added: bool = False  # Whether current user has added this skill

    class Config:
        from_attributes = True


class SkillListResponse(BaseModel):
    """Schema for paginated skill list response."""
    items: List[SkillResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# ============ User Skill Schemas ============

class UserSkillCreate(BaseModel):
    """Schema for adding a skill to user's list."""
    skill_id: UUID
    proficiency_level: Optional[ProficiencyLevel] = ProficiencyLevel.BEGINNER
    status: Optional[UserSkillStatus] = UserSkillStatus.WANT_TO_LEARN
    is_favorite: Optional[bool] = False
    notes: Optional[str] = None


class UserSkillUpdate(BaseModel):
    """Schema for updating user's skill."""
    proficiency_level: Optional[ProficiencyLevel] = None
    status: Optional[UserSkillStatus] = None
    progress_percent: Optional[int] = Field(None, ge=0, le=100)
    is_favorite: Optional[bool] = None
    notes: Optional[str] = None


class UserSkillResponse(BaseModel):
    """Schema for user skill response."""
    id: UUID
    user_id: UUID
    skill_id: UUID
    proficiency_level: Optional[str] = None
    status: Optional[str] = None
    progress_percent: int
    times_practiced: int
    total_practice_minutes: int
    is_favorite: bool
    notes: Optional[str] = None
    started_at: datetime
    last_practiced_at: Optional[datetime] = None
    mastered_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    # Include skill details
    skill: Optional[SkillResponse] = None

    class Config:
        from_attributes = True


class UserSkillListResponse(BaseModel):
    """Schema for paginated user skill list response."""
    items: List[UserSkillResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# ============ Learning Path Schemas ============

class LearningPathSkill(BaseModel):
    """Schema for a skill within a learning path."""
    skill_id: UUID
    order: int
    skill: Optional[SkillResponse] = None


class LearningPathCreate(BaseModel):
    """Schema for creating a learning path."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[LearningPathCategory] = None
    difficulty: Optional[SkillDifficulty] = SkillDifficulty.BEGINNER
    estimated_hours: Optional[int] = Field(None, ge=1)
    image_url: Optional[str] = Field(None, max_length=500)
    skill_ids: List[UUID] = Field(..., min_length=1, description="Ordered list of skill IDs")


class LearningPathUpdate(BaseModel):
    """Schema for updating a learning path."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[LearningPathCategory] = None
    difficulty: Optional[SkillDifficulty] = None
    estimated_hours: Optional[int] = Field(None, ge=1)
    image_url: Optional[str] = Field(None, max_length=500)
    skill_ids: Optional[List[UUID]] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None


class LearningPathResponse(BaseModel):
    """Schema for learning path response."""
    id: UUID
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    estimated_hours: Optional[int] = None
    skill_count: int
    image_url: Optional[str] = None
    is_active: bool
    is_featured: bool
    created_at: datetime
    updated_at: datetime
    # Include skills
    skills: List[SkillResponse] = []
    # User-specific fields (populated by API)
    is_started: bool = False
    user_progress_percent: int = 0

    class Config:
        from_attributes = True


class LearningPathListResponse(BaseModel):
    """Schema for paginated learning path list response."""
    items: List[LearningPathResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# ============ User Learning Path Schemas ============

class UserLearningPathCreate(BaseModel):
    """Schema for starting a learning path."""
    learning_path_id: UUID


class UserLearningPathUpdate(BaseModel):
    """Schema for updating user's learning path progress."""
    status: Optional[LearningPathStatus] = None
    current_skill_index: Optional[int] = Field(None, ge=0)


class UserLearningPathResponse(BaseModel):
    """Schema for user learning path response."""
    id: UUID
    user_id: UUID
    learning_path_id: UUID
    status: Optional[str] = None
    progress_percent: int
    skills_completed: int
    current_skill_index: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    # Include learning path details
    learning_path: Optional[LearningPathResponse] = None

    class Config:
        from_attributes = True


class UserLearningPathListResponse(BaseModel):
    """Schema for paginated user learning path list response."""
    items: List[UserLearningPathResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# ============ Practice Log Schemas ============

class SkillPracticeLogCreate(BaseModel):
    """Schema for logging a practice session."""
    skill_id: UUID
    duration_minutes: Optional[int] = Field(None, ge=1)
    notes: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    recipe_id: Optional[UUID] = None
    practiced_at: Optional[datetime] = None


class SkillPracticeLogResponse(BaseModel):
    """Schema for practice log response."""
    id: UUID
    user_id: UUID
    skill_id: UUID
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    rating: Optional[int] = None
    recipe_id: Optional[UUID] = None
    practiced_at: datetime
    created_at: datetime
    # Include skill details
    skill: Optional[SkillResponse] = None

    class Config:
        from_attributes = True


class SkillPracticeLogListResponse(BaseModel):
    """Schema for paginated practice log list response."""
    items: List[SkillPracticeLogResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# ============ Filter Schemas ============

class SkillFilters(BaseModel):
    """Schema for skill filters."""
    search: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    is_active: Optional[bool] = True
    page: int = 1
    per_page: int = 20
    sort_by: str = "name"
    sort_order: str = "asc"


class UserSkillFilters(BaseModel):
    """Schema for user skill filters."""
    search: Optional[str] = None
    category: Optional[str] = None
    proficiency_level: Optional[str] = None
    status: Optional[str] = None
    is_favorite: Optional[bool] = None
    page: int = 1
    per_page: int = 20
    sort_by: str = "created_at"
    sort_order: str = "desc"


class LearningPathFilters(BaseModel):
    """Schema for learning path filters."""
    search: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = True
    page: int = 1
    per_page: int = 20
    sort_by: str = "name"
    sort_order: str = "asc"


class PracticeLogFilters(BaseModel):
    """Schema for practice log filters."""
    skill_id: Optional[UUID] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    page: int = 1
    per_page: int = 20
    sort_by: str = "practiced_at"
    sort_order: str = "desc"


# ============ Bulk Action Schemas ============

class BulkSkillIds(BaseModel):
    """Request for bulk skill operations."""
    skill_ids: List[UUID] = Field(..., min_length=1)


class BulkActionResponse(BaseModel):
    """Response for bulk operations."""
    success: bool
    affected_count: int
    message: str


# ============ Analytics Schemas ============

class SkillsByCategory(BaseModel):
    """Skills breakdown by category."""
    category: str
    count: int


class SkillsByProficiency(BaseModel):
    """Skills breakdown by proficiency level."""
    proficiency_level: str
    count: int


class SkillsByStatus(BaseModel):
    """Skills breakdown by status."""
    status: str
    count: int


class RecentPractice(BaseModel):
    """Recent practice session summary."""
    skill_id: UUID
    skill_name: str
    practiced_at: datetime
    duration_minutes: Optional[int] = None
    rating: Optional[int] = None


class LearningStreak(BaseModel):
    """Learning streak data."""
    current_streak_days: int
    longest_streak_days: int
    last_practice_date: Optional[datetime] = None


class LearningAnalytics(BaseModel):
    """Learning analytics data."""
    total_skills: int = Field(..., description="Total skills in user's list")
    skills_mastered: int = Field(..., description="Skills with mastered status")
    skills_learning: int = Field(..., description="Skills currently learning")
    skills_want_to_learn: int = Field(..., description="Skills user wants to learn")
    total_practice_hours: float = Field(..., description="Total practice time in hours")
    total_practice_sessions: int = Field(..., description="Total practice sessions")
    by_category: List[SkillsByCategory] = Field(..., description="Breakdown by category")
    by_proficiency: List[SkillsByProficiency] = Field(..., description="Breakdown by proficiency")
    by_status: List[SkillsByStatus] = Field(..., description="Breakdown by status")
    recent_practice: List[RecentPractice] = Field(..., description="Recent practice sessions")
    learning_streak: LearningStreak = Field(..., description="Learning streak info")
    paths_in_progress: int = Field(..., description="Learning paths in progress")
    paths_completed: int = Field(..., description="Learning paths completed")
    avg_practice_rating: Optional[float] = Field(None, description="Average practice self-rating")


# ============ History Schemas ============

class MonthlyLearningData(BaseModel):
    """Monthly learning statistics."""
    month: str = Field(..., description="Month in YYYY-MM format")
    month_label: str = Field(..., description="Human readable month label")
    skills_added: int = Field(..., description="Skills added to user's list")
    skills_mastered: int = Field(..., description="Skills marked as mastered")
    practice_sessions: int = Field(..., description="Number of practice sessions")
    practice_minutes: int = Field(..., description="Total practice minutes")
    category_breakdown: dict = Field(..., description="Skills by category")


class LearningHistory(BaseModel):
    """Learning history data."""
    period_months: int
    total_skills_added: int
    total_skills_mastered: int
    total_practice_sessions: int
    total_practice_hours: float
    avg_monthly_practice_hours: float
    monthly_data: List[MonthlyLearningData]
    mastery_trend: dict = Field(..., description="Mastery progress over time")
