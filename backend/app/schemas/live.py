import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.alert import AlertSeverity, StreamStatus


class StreamCreate(BaseModel):
    title: str


class StreamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    ingest_url: str | None
    status: StreamStatus
    owner_id: uuid.UUID
    tenant_id: str | None
    created_at: datetime
    stopped_at: str | None


class StreamListResponse(BaseModel):
    items: list[StreamResponse]
    total: int


class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    stream_id: uuid.UUID
    severity: AlertSeverity
    category: str | None
    message: str
    frame_url: str | None
    is_dismissed: bool
    created_at: datetime


class MessageResponse(BaseModel):
    message: str
