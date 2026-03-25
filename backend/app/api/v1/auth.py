import uuid
from datetime import timedelta
from typing import Annotated

import redis.asyncio as aioredis
import structlog
from fastapi import APIRouter, Depends, Request, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.config import settings
from app.core.exceptions import ConflictError, ForbiddenError, UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    refresh_token_key,
    verify_password,
)
from app.dependencies import get_db, get_redis
from app.models.audit import AccessAuditLog, AuditAction, AuditStatus
from app.models.user import User, UserRole
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


# ── Audit helper ──────────────────────────────────────────────────────────────

def _get_client_ip(request: Request) -> str | None:
    """Return the real client IP, respecting X-Forwarded-For from proxies."""
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


async def _log_access(
    db: AsyncSession,
    *,
    action: AuditAction,
    status: AuditStatus,
    email: str,
    request: Request,
    user: User | None = None,
    failure_reason: str | None = None,
) -> None:
    log = AccessAuditLog(
        user_id=user.id if user else None,
        email=email,
        username=user.name if user else None,
        action=action,
        status=status,
        failure_reason=failure_reason,
        ip_address=_get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    db.add(log)
    # flush so the record is persisted in the same transaction as the auth action


# ── POST /auth/register ───────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=LoginResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(
    body: RegisterRequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[aioredis.Redis, Depends(get_redis)],
) -> LoginResponse:
    existing_result = await db.execute(select(User).where(User.email == body.email))
    existing = existing_result.scalar_one_or_none()
    if existing is not None:
        if existing.is_blocked:
            raise ForbiddenError(
                "This email address has been permanently blocked and cannot be used to register."
            )
        raise ConflictError(f"Email '{body.email}' is already registered.")

    user = User(
        email=body.email,
        name=body.name,
        password_hash=hash_password(body.password),
        role=UserRole.OPERATOR,
        whatsapp_number=body.whatsapp_number,
    )
    db.add(user)
    await db.flush()

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
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[aioredis.Redis, Depends(get_redis)],
) -> LoginResponse:
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    # Wrong password or unknown email
    if user is None:
        await _log_access(
            db, action=AuditAction.LOGIN, status=AuditStatus.FAILURE,
            email=body.email, request=request, failure_reason="user_not_found",
        )
        await db.flush()
        raise UnauthorizedError("Invalid email or password.")

    if not verify_password(body.password, user.password_hash):
        await _log_access(
            db, action=AuditAction.LOGIN, status=AuditStatus.FAILURE,
            email=body.email, request=request, user=user, failure_reason="invalid_password",
        )
        await db.flush()
        raise UnauthorizedError("Invalid email or password.")

    if user.is_blocked:
        await _log_access(
            db, action=AuditAction.LOGIN, status=AuditStatus.FAILURE,
            email=body.email, request=request, user=user, failure_reason="account_blocked",
        )
        await db.flush()
        raise ForbiddenError("Your account has been permanently blocked. Contact an administrator.")

    if not user.is_active:
        await _log_access(
            db, action=AuditAction.LOGIN, status=AuditStatus.FAILURE,
            email=body.email, request=request, user=user, failure_reason="account_suspended",
        )
        await db.flush()
        raise ForbiddenError("Your account has been suspended. Contact an administrator.")

    # Success
    user_id = str(user.id)
    access_token = create_access_token(user_id, extra={"role": user.role.value})
    refresh_token = create_refresh_token(user_id)

    await redis.setex(
        refresh_token_key(refresh_token),
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        user_id,
    )

    await _log_access(
        db, action=AuditAction.LOGIN, status=AuditStatus.SUCCESS,
        email=body.email, request=request, user=user,
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
    request: Request,
    redis: Annotated[aioredis.Redis, Depends(get_redis)],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
) -> MessageResponse:
    deleted = await redis.delete(refresh_token_key(body.refresh_token))
    if deleted:
        await _log_access(
            db, action=AuditAction.LOGOUT, status=AuditStatus.SUCCESS,
            email=current_user.email, request=request, user=current_user,
        )
        logger.info("user_logged_out", user_id=str(current_user.id))
    return MessageResponse(message="Logged out successfully.")


# ── GET /auth/me ──────────────────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Return the currently authenticated user",
)
async def me(current_user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(current_user)
