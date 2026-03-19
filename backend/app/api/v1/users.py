"""
User management API — admin only.

GET    /users          list all users
POST   /users          create a user
PATCH  /users/{id}     update name / role / password / is_active
DELETE /users/{id}     remove a user (cannot remove yourself)
"""

import uuid
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminUser, CurrentUser
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError, UnauthorizedError
from app.core.security import hash_password, verify_password
from app.dependencies import get_db
from app.models.user import User
from app.schemas.user import ChangeOwnPasswordRequest, UserCreate, UserListResponse, UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])
logger = structlog.get_logger(__name__)


@router.patch(
    "/me/password",
    response_model=UserResponse,
    summary="Change own password (any authenticated user)",
)
async def change_own_password(
    body: ChangeOwnPasswordRequest,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    if not verify_password(body.current_password, current_user.password_hash):
        raise UnauthorizedError("Current password is incorrect.")
    current_user.password_hash = hash_password(body.new_password)
    await db.flush()
    logger.info("user_changed_own_password", user_id=str(current_user.id))
    return UserResponse.model_validate(current_user)


@router.get(
    "",
    response_model=UserListResponse,
    summary="List all users (admin only)",
)
async def list_users(
    _admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserListResponse:
    result = await db.execute(select(User).order_by(User.created_at))
    users = list(result.scalars().all())
    return UserListResponse(items=users, total=len(users))


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user (admin only)",
)
async def create_user(
    body: UserCreate,
    _admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise ConflictError(f"Email '{body.email}' is already registered.")

    user = User(
        email=body.email,
        name=body.name,
        password_hash=hash_password(body.password),
        role=body.role,
        tenant_id=body.tenant_id,
        is_active=body.is_active,
    )
    db.add(user)
    await db.flush()
    logger.info("user_created_by_admin", user_id=str(user.id), email=user.email)
    return UserResponse.model_validate(user)


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update a user (admin only)",
)
async def update_user(
    user_id: uuid.UUID,
    body: UserUpdate,
    _admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundError("User not found.")

    if body.name is not None:
        user.name = body.name
    if body.email is not None:
        user.email = body.email
    if body.role is not None:
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.password is not None:
        user.password_hash = hash_password(body.password)

    await db.flush()
    logger.info("user_updated_by_admin", user_id=str(user.id))
    return UserResponse.model_validate(user)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a user (admin only — cannot delete yourself)",
)
async def delete_user(
    user_id: uuid.UUID,
    admin: AdminUser,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    if user_id == current_user.id:
        raise ForbiddenError("You cannot delete your own account.")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundError("User not found.")

    await db.delete(user)
    logger.info("user_deleted_by_admin", user_id=str(user_id))
