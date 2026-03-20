"""
Moderation API — B-03
Queue management, AI result retrieval, human review, and admin override.
"""

import uuid
from datetime import datetime
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminUser, CurrentUser, OperatorUser
from app.config import settings
from app.core.exceptions import NotFoundError
from app.dependencies import get_db
from app.models.moderation import (
    ModerationQueueItem,
    ModerationResult,
    ModerationStatus,
    ReviewAction,
)
from app.schemas.moderation import (
    ModerationQueueItemResponse,
    ModerationResultResponse,
    OverrideRequest,
    PaginatedQueue,
    SubmitReviewRequest,
)

router = APIRouter(prefix="/moderation", tags=["moderation"])
logger = structlog.get_logger(__name__)


# ── GET /moderation/queue ─────────────────────────────────────────────────────


@router.get(
    "/queue",
    response_model=PaginatedQueue,
    summary="List moderation queue with status and category filters",
)
async def list_queue(
    current_user: OperatorUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(settings.DEFAULT_PAGE_SIZE, ge=1, le=settings.MAX_PAGE_SIZE),
    status_filter: ModerationStatus | None = Query(None, alias="status"),  # noqa: B008
) -> PaginatedQueue:
    base_query = select(ModerationQueueItem)
    if current_user.tenant_id:
        base_query = base_query.where(ModerationQueueItem.tenant_id == current_user.tenant_id)
    if status_filter:
        base_query = base_query.where(ModerationQueueItem.status == status_filter)

    count_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(
        base_query.order_by(
            ModerationQueueItem.priority.desc(), ModerationQueueItem.created_at.asc()
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = result.scalars().all()

    return PaginatedQueue(
        items=[
            ModerationQueueItemResponse(
                id=item.id,
                video_id=item.video_id,
                moderation_result_id=item.moderation_result_id,
                status=item.status,
                priority=item.priority,
                assigned_to=item.assigned_to,
                tenant_id=item.tenant_id,
                created_at=item.created_at,
            )
            for item in items
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


# ── GET /moderation/videos/{video_id} ────────────────────────────────────────


@router.get(
    "/videos/{video_id}",
    response_model=ModerationResultResponse,
    summary="Get full AI moderation result for a video",
)
async def get_moderation_result(
    video_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ModerationResultResponse:
    result = await db.execute(select(ModerationResult).where(ModerationResult.video_id == video_id))
    moderation = result.scalar_one_or_none()
    if not moderation:
        raise NotFoundError("ModerationResult", str(video_id))

    return ModerationResultResponse.model_validate(moderation)


# ── POST /moderation/{moderation_id}/review ───────────────────────────────────


@router.post(
    "/{moderation_id}/review",
    response_model=ModerationResultResponse,
    summary="Submit a human review decision (approve / reject / escalate)",
)
async def submit_review(
    moderation_id: uuid.UUID,
    body: SubmitReviewRequest,
    current_user: OperatorUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ModerationResultResponse:
    result = await db.execute(select(ModerationResult).where(ModerationResult.id == moderation_id))
    moderation = result.scalar_one_or_none()
    if not moderation:
        raise NotFoundError("ModerationResult", str(moderation_id))

    status_map: dict[ReviewAction, ModerationStatus] = {
        ReviewAction.APPROVE: ModerationStatus.APPROVED,
        ReviewAction.REJECT: ModerationStatus.REJECTED,
        ReviewAction.ESCALATE: ModerationStatus.ESCALATED,
    }

    moderation.status = status_map[body.action]
    moderation.reviewed_by = current_user.id
    moderation.review_action = body.action
    moderation.review_notes = body.notes
    moderation.reviewed_at = datetime.now(datetime.UTC).isoformat()

    # Update queue item status too
    queue_result = await db.execute(
        select(ModerationQueueItem).where(ModerationQueueItem.moderation_result_id == moderation_id)
    )
    queue_item = queue_result.scalar_one_or_none()
    if queue_item:
        queue_item.status = status_map[body.action]

    logger.info(
        "review_submitted",
        moderation_id=str(moderation_id),
        action=body.action.value,
        reviewer=str(current_user.id),
    )
    # Stub: fire webhook event — notification_service.dispatch("moderation.reviewed", payload)
    return ModerationResultResponse.model_validate(moderation)


# ── PUT /moderation/{moderation_id}/override ─────────────────────────────────


@router.put(
    "/{moderation_id}/override",
    response_model=ModerationResultResponse,
    summary="Admin override of AI or human moderation decision",
)
async def override_decision(
    moderation_id: uuid.UUID,
    body: OverrideRequest,
    current_user: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ModerationResultResponse:
    result = await db.execute(select(ModerationResult).where(ModerationResult.id == moderation_id))
    moderation = result.scalar_one_or_none()
    if not moderation:
        raise NotFoundError("ModerationResult", str(moderation_id))

    moderation.override_by = current_user.id
    moderation.override_decision = body.decision
    moderation.override_at = datetime.now(datetime.UTC).isoformat()

    logger.info(
        "decision_overridden",
        moderation_id=str(moderation_id),
        decision=body.decision,
        admin=str(current_user.id),
    )
    return ModerationResultResponse.model_validate(moderation)
