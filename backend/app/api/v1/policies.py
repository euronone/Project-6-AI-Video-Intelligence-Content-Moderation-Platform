"""
Policies API — B-06
CRUD for content moderation rule sets.
"""

import uuid
from typing import Annotated

import redis.asyncio as aioredis
import structlog
from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminUser, CurrentUser
from app.core.exceptions import NotFoundError, ValidationError
from app.dependencies import get_db, get_redis
from app.models.policy import Policy
from app.schemas.policy import (
    PolicyCreate,
    PolicyListResponse,
    PolicyResponse,
    PolicyUpdate,
)

router = APIRouter(prefix="/policies", tags=["policies"])
logger = structlog.get_logger(__name__)


def _policy_cache_key(tenant_id: str | None) -> str:
    return f"policy:{tenant_id or 'global'}:active"


# ── GET /policies ─────────────────────────────────────────────────────────────


@router.get("", response_model=PolicyListResponse, summary="List all policies for the org")
async def list_policies(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PolicyListResponse:
    q = select(Policy)
    if current_user.tenant_id:
        q = q.where(Policy.tenant_id == current_user.tenant_id)

    total = await db.scalar(select(func.count()).select_from(q.subquery())) or 0
    result = await db.execute(q.order_by(Policy.is_default.desc(), Policy.created_at.desc()))
    policies = result.scalars().all()

    return PolicyListResponse(
        items=[PolicyResponse.model_validate(p) for p in policies],
        total=total,
    )


# ── POST /policies ────────────────────────────────────────────────────────────


@router.post(
    "",
    response_model=PolicyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new moderation policy",
)
async def create_policy(
    body: PolicyCreate,
    current_user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[aioredis.Redis, Depends(get_redis)],
) -> PolicyResponse:
    rules_data = [r.model_dump() for r in body.rules] if body.rules else None

    policy = Policy(
        name=body.name,
        description=body.description,
        is_active=body.is_active,
        is_default=body.is_default,
        rules=rules_data,
        default_action=body.default_action,
        owner_id=current_user.id,
        tenant_id=current_user.tenant_id,
    )
    db.add(policy)
    await db.flush()

    await redis.delete(_policy_cache_key(current_user.tenant_id))
    logger.info("policy_created", policy_id=str(policy.id))
    return PolicyResponse.model_validate(policy)


# ── GET /policies/{id} ────────────────────────────────────────────────────────


@router.get("/{policy_id}", response_model=PolicyResponse, summary="Get policy detail")
async def get_policy(
    policy_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PolicyResponse:
    result = await db.execute(select(Policy).where(Policy.id == policy_id))
    policy = result.scalar_one_or_none()
    if not policy:
        raise NotFoundError("Policy", str(policy_id))
    return PolicyResponse.model_validate(policy)


# ── PUT /policies/{id} ────────────────────────────────────────────────────────


@router.put("/{policy_id}", response_model=PolicyResponse, summary="Update a moderation policy")
async def update_policy(
    policy_id: uuid.UUID,
    body: PolicyUpdate,
    current_user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[aioredis.Redis, Depends(get_redis)],
) -> PolicyResponse:
    result = await db.execute(select(Policy).where(Policy.id == policy_id))
    policy = result.scalar_one_or_none()
    if not policy:
        raise NotFoundError("Policy", str(policy_id))

    if body.name is not None:
        policy.name = body.name
    if body.description is not None:
        policy.description = body.description
    if body.is_active is not None:
        policy.is_active = body.is_active
    if body.is_default is not None:
        policy.is_default = body.is_default
    if body.rules is not None:
        policy.rules = [r.model_dump() for r in body.rules]
    if body.default_action is not None:
        policy.default_action = body.default_action

    await redis.delete(_policy_cache_key(current_user.tenant_id))
    logger.info("policy_updated", policy_id=str(policy_id))
    return PolicyResponse.model_validate(policy)


# ── DELETE /policies/{id} ─────────────────────────────────────────────────────


@router.delete(
    "/{policy_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a policy (cannot delete the only active default policy)",
)
async def delete_policy(
    policy_id: uuid.UUID,
    current_user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[aioredis.Redis, Depends(get_redis)],
) -> None:
    result = await db.execute(select(Policy).where(Policy.id == policy_id))
    policy = result.scalar_one_or_none()
    if not policy:
        raise NotFoundError("Policy", str(policy_id))

    if policy.is_default and policy.is_active:
        raise ValidationError(
            "Cannot delete the only active default policy.",
            {"policy_id": str(policy_id)},
        )

    await db.delete(policy)
    await redis.delete(_policy_cache_key(current_user.tenant_id))
    logger.info("policy_deleted", policy_id=str(policy_id))
