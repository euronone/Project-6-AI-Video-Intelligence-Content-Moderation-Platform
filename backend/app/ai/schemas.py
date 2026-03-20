"""
Pydantic v2 schemas for AI agent inputs and outputs.

These schemas are the contracts between agents and the orchestrator.
They are also used to validate the final moderation report before it
is persisted to the database.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field

# ── Enums ────────────────────────────────────────────────────────────────────


class ViolationSeverity(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ModerationDecision(StrEnum):
    APPROVED = "approved"
    REJECTED = "rejected"
    ESCALATED = "escalated"  # needs human review
    NEEDS_REVIEW = "needs_review"


class SceneCategory(StrEnum):
    SAFE = "safe"
    VIOLENCE = "violence"
    NUDITY = "nudity"
    DRUGS = "drugs"
    HATE_SYMBOLS = "hate_symbols"
    SELF_HARM = "self_harm"
    SPAM = "spam"
    MISINFORMATION = "misinformation"
    OTHER = "other"


# ── Per-agent output schemas ──────────────────────────────────────────────────


class Violation(BaseModel):
    category: SceneCategory
    severity: ViolationSeverity
    timestamp: float = Field(..., description="Seconds from start of video")
    confidence: float = Field(..., ge=0.0, le=1.0)
    description: str
    frame_index: int | None = None


class ContentAnalysisResult(BaseModel):
    summary: str
    topics: list[str] = Field(default_factory=list)
    sentiment: str = "neutral"  # positive / negative / neutral / mixed
    language: str = "en"
    duration_seconds: float | None = None
    raw_response: str = ""


class SafetyResult(BaseModel):
    decision: ModerationDecision
    overall_severity: ViolationSeverity = ViolationSeverity.LOW
    violations: list[Violation] = Field(default_factory=list)
    policy_triggers: list[str] = Field(default_factory=list)
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    reasoning: str = ""


class MetadataResult(BaseModel):
    entities: list[str] = Field(default_factory=list)
    brands: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    ocr_text: list[str] = Field(default_factory=list)
    objects_detected: list[str] = Field(default_factory=list)
    locations: list[str] = Field(default_factory=list)


class SceneClassification(BaseModel):
    frame_index: int
    timestamp: float
    category: SceneCategory
    confidence: float = Field(..., ge=0.0, le=1.0)
    sub_categories: list[str] = Field(default_factory=list)


class ModerationReport(BaseModel):
    video_id: str
    decision: ModerationDecision
    overall_severity: ViolationSeverity = ViolationSeverity.LOW
    confidence: float = Field(..., ge=0.0, le=1.0)
    violations: list[Violation] = Field(default_factory=list)
    content_summary: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)
    scene_summary: dict[str, int] = Field(default_factory=dict)  # category → count
    policy_triggers: list[str] = Field(default_factory=list)
    transcript_excerpt: str = ""
    processing_errors: list[str] = Field(default_factory=list)
    agents_completed: list[str] = Field(default_factory=list)
