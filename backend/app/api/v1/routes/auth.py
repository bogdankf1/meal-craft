from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter()


@router.post("/google")
async def google_oauth_callback(db: AsyncSession = Depends(get_db)):
    """Google OAuth callback - creates or updates user."""
    # TODO: Implement Google OAuth flow
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Google OAuth not yet implemented"
    )


@router.get("/me")
async def get_current_user(db: AsyncSession = Depends(get_db)):
    """Get current authenticated user."""
    # TODO: Implement with JWT verification
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Auth not yet implemented"
    )


@router.post("/verify")
async def verify_token():
    """Verify JWT token validity."""
    # TODO: Implement token verification
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Token verification not yet implemented"
    )


@router.post("/logout")
async def logout():
    """Logout user (client-side token removal)."""
    return {"message": "Logged out successfully"}
