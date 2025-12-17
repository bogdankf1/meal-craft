"""
API router for Backup operations.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.api.v1.routes.backups import service
from app.api.v1.routes.backups.schemas import (
    BackupCreate,
    BackupResponse,
    BackupRestoreResponse
)


router = APIRouter(prefix="/backups", tags=["Backups"])


@router.post("", response_model=BackupResponse, status_code=status.HTTP_201_CREATED)
async def create_backup(
    backup_data: BackupCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new backup for a specific module.
    """
    try:
        backup = await service.create_backup(db, current_user.id, backup_data)

        return BackupResponse(
            id=backup.id,
            user_id=backup.user_id,
            module_type=backup.module_type,
            created_at=backup.created_at,
            item_count=len(backup.backup_data)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create backup: {str(e)}"
        )


@router.get("", response_model=List[BackupResponse])
async def list_backups(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all backups for the current user.
    """
    backups = await service.get_user_backups(db, current_user.id)

    return [
        BackupResponse(
            id=backup.id,
            user_id=backup.user_id,
            module_type=backup.module_type,
            created_at=backup.created_at,
            item_count=len(backup.backup_data)
        )
        for backup in backups
    ]


@router.post("/{backup_id}/restore", response_model=BackupRestoreResponse)
async def restore_backup(
    backup_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Restore a backup by recreating all items from it.
    WARNING: This will delete all current items for the module and replace them with backup data.
    """
    try:
        restored_count = await service.restore_backup(db, current_user.id, backup_id)

        return BackupRestoreResponse(
            success=True,
            message="Successfully restored backup",
            restored_count=restored_count
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to restore backup: {str(e)}"
        )


@router.delete("/{backup_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_backup(
    backup_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a backup.
    """
    try:
        await service.delete_backup(db, current_user.id, backup_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
