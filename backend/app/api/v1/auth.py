import uuid
from datetime import timedelta
from typing import Annotated

import redis.asyncio as aioredis
import structlog
from fastapi import APIRouter, Depends, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.config import settings
from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    refresh_token_key,
    verify_password,
)
from app.dependencies import get_db, get_redis
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
)
from app.schemas.user import UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])
logger = structlog.get_logger(__name__)


# ── POST /auth/register ───────────────────────────────────────────────────────


@router.post(
    "/register",
    response_model=LoginResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(
    body: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[aioredis.Redis, Depends(get_redis)],
) -> LoginResponse:
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise ConflictError(f"Email '{body.email}' is already registered.")

    user = User(
        email=body.email,
        name=body.name,
        password_hash=hash_password(body.password),
        role=body.role,
    )
    db.add(user)
    await db.flush()  # get user.id before commit

    user_id = str(user.id)
    access_token = create_access_token(user_id, extra={"role": user.role.value})
    refresh_token = create_refresh_token(user_id)

    await redis.setex(
        refresh_token_key(refresh_token),
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        user_id,
    )

    logger.info("user_registered", user_id=user_id, email=user.email)
    return LoginResponse(
        user=UserResponse.model_validate(user),
        access_token=access_token,
        refresh_token=refresh_token,
    )


# ── POST /auth/login ──────────────────────────────────────────────────────────


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Authenticate and receive JWT tokens",
)
async def login(
    body: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[aioredis.Redis, Depends(get_redis)],
) -> LoginResponse:
    result = await db.execute(
        select(User).where(User.email == body.email, User.is_active.is_(True))
    )
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        raise UnauthorizedError("Invalid email or password.")

    user_id = str(user.id)
    access_token = create_access_token(user_id, extra={"role": user.role.value})
    refresh_token = create_refresh_token(user_id)

    await redis.setex(
        refresh_token_key(refresh_token),
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        user_id,
    )

    logger.info("user_logged_in", user_id=user_id)
    return LoginResponse(
        user=UserResponse.model_validate(user),
        access_token=access_token,
        refresh_token=refresh_token,
    )


# ── POST /auth/refresh ────────────────────────────────────────────────────────


@router.post(
    "/refresh",
    response_model=TokenPair,
    summary="Rotate access token using a valid refresh token",
)
async def refresh(
    body: RefreshRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[aioredis.Redis, Depends(get_redis)],
) -> TokenPair:
    try:
        payload = decode_token(body.refresh_token)
    except JWTError as exc:
        raise UnauthorizedError("Invalid or expired refresh token.") from exc

    if payload.get("type") != "refresh":
        raise UnauthorizedError("Invalid token type.")

    rkey = refresh_token_key(body.refresh_token)
    stored_user_id = await redis.get(rkey)
    if not stored_user_id:
        raise UnauthorizedError("Refresh token has been revoked or expired.")

    result = await db.execute(
        select(User).where(User.id == uuid.UUID(stored_user_id), User.is_active.is_(True))
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise UnauthorizedError("User not found or inactive.")

    # Rotate: delete old, issue new pair
    await redis.delete(rkey)
    user_id = str(user.id)
    new_access = create_access_token(user_id, extra={"role": user.role.value})
    new_refresh = create_refresh_token(user_id)

    await redis.setex(
        refresh_token_key(new_refresh),
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        user_id,
    )

    logger.info("tokens_rotated", user_id=user_id)
    return TokenPair(access_token=new_access, refresh_token=new_refresh)


# ── POST /auth/logout ─────────────────────────────────────────────────────────


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Invalidate the current refresh token",
)
async def logout(
    body: RefreshRequest,
    redis: Annotated[aioredis.Redis, Depends(get_redis)],
    _: CurrentUser,
) -> MessageResponse:
    deleted = await redis.delete(refresh_token_key(body.refresh_token))
    if deleted:
        logger.info("user_logged_out")
    return MessageResponse(message="Logged out successfully.")


# ── GET /auth/me ──────────────────────────────────────────────────────────────


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Return the currently authenticated user",
)
async def me(current_user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(current_user)
