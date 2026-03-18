"""
Live Stream API — B-05
Stream registration, management, and real-time WebSocket events.
"""
import json
import uuid
from datetime import datetime, timezone
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, OperatorUser
from app.config import settings
from app.core.exceptions import ForbiddenError, NotFoundError, UnauthorizedError
from app.core.security import decode_token
from app.dependencies import get_db, get_redis
from app.models.alert import LiveStream, StreamStatus
from app.schemas.live import MessageResponse, StreamCreate, StreamListResponse, StreamResponse

import redis.asyncio as aioredis
from jose import JWTError

router = APIRouter(prefix="/live", tags=["live"])
logger = structlog.get_logger(__name__)

# In-memory WebSocket connection registry  { stream_id: [WebSocket] }
_ws_connections: dict[str, list[WebSocket]] = {}


# ── GET /live/streams ─────────────────────────────────────────────────────────

@router.get("/streams", response_model=StreamListResponse, summary="List active live streams")
async def list_streams(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    active_only: bool = Query(True),
) -> StreamListResponse:
    q = select(LiveStream)
    if current_user.tenant_id:
        q = q.where(LiveStream.tenant_id == current_user.tenant_id)
    if active_only:
        q = q.where(LiveStream.status == StreamStatus.ACTIVE)

    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar_one()

    result = await db.execute(q.order_by(LiveStream.created_at.desc()))
    streams = result.scalars().all()

    return StreamListResponse(
        items=[StreamResponse.model_validate(s) for s in streams],
        total=total,
    )


# ── POST /live/streams ────────────────────────────────────────────────────────

@router.post(
    "/streams",
    response_model=StreamResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register and start a new live stream",
)
async def create_stream(
    body: StreamCreate,
    current_user: OperatorUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamResponse:
    stream_id = uuid.uuid4()
    ingest_url = f"rtmp://{settings.AWS_REGION}.ingest.vidshield.ai/live/{stream_id}"

    stream = LiveStream(
        id=stream_id,
        title=body.title,
        ingest_url=ingest_url,
        status=StreamStatus.ACTIVE,
        owner_id=current_user.id,
        tenant_id=current_user.tenant_id,
    )
    db.add(stream)
    await db.flush()

    # Stub: stream_service.start_ingestion.delay(str(stream_id))
    logger.info("stream_created", stream_id=str(stream_id))
    return StreamResponse.model_validate(stream)


# ── GET /live/streams/{id} ────────────────────────────────────────────────────

@router.get(
    "/streams/{stream_id}",
    response_model=StreamResponse,
    summary="Get live stream detail and current status",
)
async def get_stream(
    stream_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamResponse:
    result = await db.execute(select(LiveStream).where(LiveStream.id == stream_id))
    stream = result.scalar_one_or_none()
    if not stream:
        raise NotFoundError("LiveStream", str(stream_id))

    return StreamResponse.model_validate(stream)


# ── POST /live/streams/{id}/stop ──────────────────────────────────────────────

@router.post(
    "/streams/{stream_id}/stop",
    response_model=MessageResponse,
    summary="Stop an active live stream",
)
async def stop_stream(
    stream_id: uuid.UUID,
    current_user: OperatorUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MessageResponse:
    result = await db.execute(select(LiveStream).where(LiveStream.id == stream_id))
    stream = result.scalar_one_or_none()
    if not stream:
        raise NotFoundError("LiveStream", str(stream_id))

    stream.status = StreamStatus.STOPPED
    stream.stopped_at = datetime.now(timezone.utc).isoformat()

    # Notify connected WebSocket clients
    sid = str(stream_id)
    if sid in _ws_connections:
        payload = json.dumps({"event": "stream.stopped", "stream_id": sid})
        for ws in _ws_connections[sid]:
            try:
                await ws.send_text(payload)
            except Exception:
                pass

    logger.info("stream_stopped", stream_id=str(stream_id))
    return MessageResponse(message="Stream stopped successfully.")


# ── WS /live/ws/streams/{id} ──────────────────────────────────────────────────

@router.websocket("/ws/streams/{stream_id}")
async def websocket_stream(
    stream_id: str,
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token"),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    WebSocket endpoint for real-time stream events.
    Auth: JWT passed as ?token= query param.
    Events pushed: { event: "frame.alert" | "stream.stopped", ... }
    """
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            await websocket.close(code=4001)
            return
    except JWTError:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    sid = stream_id

    if sid not in _ws_connections:
        _ws_connections[sid] = []
    _ws_connections[sid].append(websocket)
    logger.info("ws_client_connected", stream_id=sid, user=payload.get("sub"))

    try:
        while True:
            # Keep connection alive; server pushes events on stream activity
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        logger.info("ws_client_disconnected", stream_id=sid)
    finally:
        if sid in _ws_connections:
            try:
                _ws_connections[sid].remove(websocket)
            except ValueError:
                pass
