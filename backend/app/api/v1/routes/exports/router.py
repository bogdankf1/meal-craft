"""
Exports module API router
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from calendar import month_name
import io

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.api.v1.routes.exports import service
from app.api.v1.routes.exports.schemas import ExportRequest, ExportResponse

router = APIRouter(prefix="/exports", tags=["Exports"])


@router.post("/", response_model=ExportResponse)
async def export_data(
    export_request: ExportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Export data in specified format (CSV, etc.)
    Returns metadata about the export.
    """
    try:
        content, row_count = await service.export_data(
            db=db,
            user_id=current_user.id,
            entry_type=export_request.entry_type,
            format=export_request.format,
            start_date=export_request.start_date,
            end_date=export_request.end_date
        )

        # Generate filename
        if export_request.start_date:
            month_str = month_name[export_request.start_date.month]
            year_str = str(export_request.start_date.year)
            filename = f"{export_request.entry_type}_{month_str}_{year_str}.{export_request.format}"
        else:
            filename = f"{export_request.entry_type}_all.{export_request.format}"

        return ExportResponse(
            success=True,
            message=f"Successfully exported {row_count} records",
            filename=filename,
            row_count=row_count
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to export data: {str(e)}"
        )


@router.post("/download")
async def download_export(
    export_request: ExportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Download exported data as file
    """
    try:
        content, row_count = await service.export_data(
            db=db,
            user_id=current_user.id,
            entry_type=export_request.entry_type,
            format=export_request.format,
            start_date=export_request.start_date,
            end_date=export_request.end_date
        )

        # Generate filename
        if export_request.start_date:
            month_str = month_name[export_request.start_date.month]
            year_str = str(export_request.start_date.year)
            filename = f"{export_request.entry_type}_{month_str}_{year_str}.{export_request.format}"
        else:
            filename = f"{export_request.entry_type}_all.{export_request.format}"

        # Return as downloadable file
        return StreamingResponse(
            io.BytesIO(content.encode('utf-8')),
            media_type='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to export data: {str(e)}"
        )
