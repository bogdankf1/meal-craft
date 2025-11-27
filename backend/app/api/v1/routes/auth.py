"""
Authentication API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token, verify_token
from app.models.user import User, UserRole, SubscriptionTier
from app.api.deps import get_current_user

router = APIRouter()


class GoogleAuthRequest(BaseModel):
    """Request body for Google OAuth sign-in."""
    email: EmailStr
    name: Optional[str] = None
    google_id: str
    avatar_url: Optional[str] = None


class TokenResponse(BaseModel):
    """Response with access and refresh tokens."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """User response model."""
    id: str
    email: str
    name: Optional[str]
    avatar_url: Optional[str]
    role: str
    subscription_tier: str
    locale: str
    is_active: bool

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    """Response from Google OAuth sign-in."""
    user: UserResponse
    tokens: TokenResponse


class RefreshTokenRequest(BaseModel):
    """Request body for token refresh."""
    refresh_token: str


@router.post("/google", response_model=AuthResponse)
async def google_oauth_signin(
    request: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Google OAuth sign-in - creates or updates user and returns JWT tokens.

    Called from frontend after successful Google OAuth authentication.
    """
    # Check if user exists by google_id
    result = await db.execute(
        select(User).where(User.google_id == request.google_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        # Check if user exists by email (might have registered differently)
        result = await db.execute(
            select(User).where(User.email == request.email)
        )
        user = result.scalar_one_or_none()

        if user:
            # Link Google account to existing user
            user.google_id = request.google_id
            if request.avatar_url and not user.avatar_url:
                user.avatar_url = request.avatar_url
            if request.name and not user.name:
                user.name = request.name
        else:
            # Create new user
            user = User(
                email=request.email,
                name=request.name,
                google_id=request.google_id,
                avatar_url=request.avatar_url,
                role=UserRole.USER,
                subscription_tier=SubscriptionTier.FREE,
                is_active=True,
            )
            db.add(user)

        await db.commit()
        await db.refresh(user)

    # Update user info if changed
    if request.name and user.name != request.name:
        user.name = request.name
    if request.avatar_url and user.avatar_url != request.avatar_url:
        user.avatar_url = request.avatar_url

    await db.commit()

    # Generate tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return AuthResponse(
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            name=user.name,
            avatar_url=user.avatar_url,
            role=user.role.value,
            subscription_tier=user.subscription_tier.value,
            locale=user.locale,
            is_active=user.is_active,
        ),
        tokens=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
        ),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Refresh access token using a valid refresh token.
    """
    payload = verify_token(request.refresh_token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    # Verify user still exists and is active
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Generate new tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """
    Get current authenticated user profile.
    """
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        avatar_url=current_user.avatar_url,
        role=current_user.role.value,
        subscription_tier=current_user.subscription_tier.value,
        locale=current_user.locale,
        is_active=current_user.is_active,
    )


@router.post("/verify")
async def verify_auth_token(
    current_user: User = Depends(get_current_user),
):
    """
    Verify JWT token is valid.

    Returns user info if token is valid.
    """
    return {
        "valid": True,
        "user_id": str(current_user.id),
        "email": current_user.email,
    }


@router.post("/logout")
async def logout():
    """
    Logout user.

    Note: Actual token invalidation happens client-side by removing stored tokens.
    For enhanced security, consider implementing a token blacklist.
    """
    return {"message": "Logged out successfully"}
