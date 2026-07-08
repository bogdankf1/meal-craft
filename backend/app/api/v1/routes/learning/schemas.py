"""Learning & Skills request/response schemas.

The learning Pydantic models are defined centrally in
``app.schemas.learning``. This module re-exports them so the learning package
follows the same router / service / schemas layout as the other feature
packages, while keeping a single source of truth.
"""
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

__all__ = [
    "SkillCreate",
    "SkillUpdate",
    "SkillResponse",
    "SkillListResponse",
    "SkillFilters",
    "UserSkillCreate",
    "UserSkillUpdate",
    "UserSkillResponse",
    "UserSkillListResponse",
    "UserSkillFilters",
    "LearningPathCreate",
    "LearningPathUpdate",
    "LearningPathResponse",
    "LearningPathListResponse",
    "LearningPathFilters",
    "UserLearningPathCreate",
    "UserLearningPathUpdate",
    "UserLearningPathResponse",
    "UserLearningPathListResponse",
    "SkillPracticeLogCreate",
    "SkillPracticeLogResponse",
    "SkillPracticeLogListResponse",
    "PracticeLogFilters",
    "BulkSkillIds",
    "BulkActionResponse",
    "LearningAnalytics",
    "SkillsByCategory",
    "SkillsByProficiency",
    "SkillsByStatus",
    "RecentPractice",
    "LearningStreak",
    "LearningHistory",
    "MonthlyLearningData",
]
