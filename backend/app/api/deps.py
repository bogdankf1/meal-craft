"""
API Dependencies - Authentication and authorization.
"""
from typing import Optional, Sequence, Type, TypeVar
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import verify_token
from app.models.user import User

# HTTP Bearer token security scheme
security = HTTPBearer(auto_error=False)

ModelT = TypeVar("ModelT")


async def get_owned_or_404(
    db: AsyncSession,
    model: Type[ModelT],
    obj_id,
    user: User,
    owner_field: str = "user_id",
    detail: str = "Not found",
    options: Optional[Sequence] = None,
) -> ModelT:
    """Fetch a row by id owned by ``user``, or raise HTTP 404.

    Replicates the repeated "select by id + owner; raise 404 if missing or not
    owned" pattern. ``options`` accepts SQLAlchemy loader options (e.g.
    ``selectinload(...)``) for eager loading. ``detail`` is the exact message
    used by the 404 raised when no matching row exists.
    """
    query = select(model).where(
        model.id == obj_id,
        getattr(model, owner_field) == user.id,
    )
    if options:
        query = query.options(*options)
    result = await db.execute(query)
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail=detail)
    return obj


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get the current authenticated user from JWT token.

    Raises HTTPException 401 if not authenticated.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = verify_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user_id from token payload
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch user from database
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive",
        )

    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Get the current user if authenticated, otherwise return None.

    Useful for endpoints that work for both authenticated and anonymous users.
    """
    if not credentials:
        return None

    token = credentials.credentials
    payload = verify_token(token)

    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        return None

    return user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get the current user and verify they have admin role.

    Raises HTTPException 403 if not admin.
    """
    from app.models.user import UserRole

    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return current_user
