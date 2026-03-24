"""
W-02 Video Tasks

Async video processing pipeline triggered after a video is registered.
All heavy AI work runs in the Celery worker process; the FastAPI request
path is never blocked.

Task execution order for a full pipeline run:

    process_video(video_id, s3_key)
        ├── extract_frames_task(video_id, s3_url)
        ├── transcribe_audio_task(video_id, local_path)
        ├── generate_thumbnail_task(video_id, s3_key)
        └── run_analysis_pipeline_task(video_id, s3_url, policy_rules)

Public entry point:
    process_video.delay(video_id="...", s3_key="videos/abc.mp4")
"""

from __future__ import annotations

import asyncio
import os
import subprocess
import tempfile
import uuid
from datetime import UTC, datetime
from typing import Any

import boto3
import structlog
from celery import shared_task

from app.ai.graphs.video_analysis_graph import run_video_analysis
from app.ai.tools.audio_transcriber import transcribe_audio
from app.ai.tools.frame_extractor import FrameExtractionError, extract_frames
from app.config import settings
from app.models.moderation import ModerationResult, ModerationStatus
from app.models.video import Video, VideoStatus
from app.workers.celery_app import sync_session

logger = structlog.get_logger(__name__)


# ── Helpers ────────────────────────────────────────────────────────────────────


def _s3_url(s3_key: str) -> str:
    """Build an s3:// URL from a storage key."""
    return f"s3://{settings.S3_BUCKET_NAME}/{s3_key}"


def _s3_client():
    return boto3.client(
        "s3",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
    )


def _set_video_status(video_id: str, status: VideoStatus, error: str | None = None) -> None:
    """Update the video row status in the database."""
    with sync_session() as db:
        video = db.get(Video, uuid.UUID(video_id))
        if video:
            video.status = status
            if error:
                video.error_message = error
            video.updated_at = datetime.now(UTC)


# ── W-02-A: Frame extraction ───────────────────────────────────────────────────


@shared_task(
    bind=True,
    name="app.workers.video_tasks.extract_frames_task",
    max_retries=3,
    default_retry_delay=30,
)
def extract_frames_task(
    self,
    video_id: str,
    s3_key: str,
    interval_seconds: float = 2.0,
    max_frames: int = 30,
) -> dict[str, Any]:
    """
    Extract frames from an S3-hosted video using T-01 FrameExtractor.

    Returns:
        {"frames": [...], "timestamps": [...], "fps": float, "duration": float}
    """
    logger.info("extract_frames_task_start", video_id=video_id, s3_key=s3_key)
    try:
        result = extract_frames(
            _s3_url(s3_key),
            interval_seconds=interval_seconds,
            max_frames=max_frames,
        )
        logger.info(
            "extract_frames_task_done",
            video_id=video_id,
            frame_count=result.frame_count_extracted,
        )
        return {
            "frames": result.frames,
            "timestamps": result.timestamps,
            "fps": result.fps,
            "duration": result.duration,
        }
    except FrameExtractionError as exc:
        logger.error("extract_frames_task_error", video_id=video_id, error=str(exc))
        raise self.retry(exc=exc) from exc


# ── W-02-B: Audio transcription ────────────────────────────────────────────────


@shared_task(
    bind=True,
    name="app.workers.video_tasks.transcribe_audio_task",
    max_retries=3,
    default_retry_delay=30,
)
def transcribe_audio_task(
    self,
    video_id: str,
    s3_key: str,
    language: str | None = None,
) -> dict[str, Any]:
    """
    Download video from S3 to a temp file and transcribe via T-02 AudioTranscriber.

    Returns:
        {"text": str, "segments": [...], "language": str, "error": str | None}
    """
    logger.info("transcribe_audio_task_start", video_id=video_id)

    # Download S3 object to a temp file for FFmpeg
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=".mp4")
    os.close(tmp_fd)
    try:
        _s3_client().download_file(settings.S3_BUCKET_NAME, s3_key, tmp_path)
        result = asyncio.run(transcribe_audio(tmp_path, language=language))
        logger.info(
            "transcribe_audio_task_done",
            video_id=video_id,
            text_len=len(result.text),
            error=result.error,
        )
        return {
            "text": result.text,
            "segments": [s.model_dump() for s in result.segments],
            "language": result.language,
            "error": result.error,
        }
    except Exception as exc:
        logger.error("transcribe_audio_task_error", video_id=video_id, error=str(exc))
        raise self.retry(exc=exc) from exc
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


# ── W-02-C: Thumbnail generation ───────────────────────────────────────────────


@shared_task(
    bind=True,
    name="app.workers.video_tasks.generate_thumbnail_task",
    max_retries=2,
    default_retry_delay=15,
)
def generate_thumbnail_task(self, video_id: str, s3_key: str) -> str | None:
    """
    Generate a JPEG thumbnail from the video's first keyframe using FFmpeg
    and upload it to S3.

    Returns:
        The S3 key of the thumbnail, or None on failure.
    """
    logger.info("generate_thumbnail_task_start", video_id=video_id)
    tmp_video_fd, tmp_video = tempfile.mkstemp(suffix=".mp4")
    tmp_thumb_fd, tmp_thumb = tempfile.mkstemp(suffix=".jpg")
    os.close(tmp_video_fd)
    os.close(tmp_thumb_fd)

    try:
        _s3_client().download_file(settings.S3_BUCKET_NAME, s3_key, tmp_video)

        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            tmp_video,
            "-vframes",
            "1",
            "-an",
            "-q:v",
            "2",
            tmp_thumb,
        ]
        proc = subprocess.run(cmd, capture_output=True, timeout=60, check=False)
        if proc.returncode != 0:
            err = proc.stderr.decode("utf-8", errors="replace")
            logger.warning("generate_thumbnail_ffmpeg_failed", video_id=video_id, error=err)
            return None

        thumb_key = f"thumbnails/{video_id}.jpg"
        _s3_client().upload_file(tmp_thumb, settings.S3_BUCKET_NAME, thumb_key)

        # Persist thumbnail key on the video row
        with sync_session() as db:
            video = db.get(Video, uuid.UUID(video_id))
            if video:
                video.thumbnail_s3_key = thumb_key
                video.updated_at = datetime.now(UTC)

        logger.info("generate_thumbnail_task_done", video_id=video_id, thumb_key=thumb_key)
        return thumb_key

    except Exception as exc:
        logger.error("generate_thumbnail_task_error", video_id=video_id, error=str(exc))
        raise self.retry(exc=exc) from exc
    finally:
        for p in (tmp_video, tmp_thumb):
            if os.path.exists(p):
                os.unlink(p)


# ── W-02-D: Full AI analysis pipeline ─────────────────────────────────────────


@shared_task(
    bind=True,
    name="app.workers.video_tasks.run_analysis_pipeline_task",
    max_retries=2,
    default_retry_delay=60,
)
def run_analysis_pipeline_task(
    self,
    video_id: str,
    s3_key: str,
    policy_rules: list[dict[str, Any]] | None = None,
    frames: list[str] | None = None,
    transcript: str | None = None,
) -> dict[str, Any]:
    """
    Invoke the LangGraph video analysis pipeline (C-04) and persist the result.

    Writes / updates a ModerationResult row for the given video.

    Returns:
        The ModerationReport as a dict.
    """
    logger.info("run_analysis_pipeline_task_start", video_id=video_id)

    try:
        report = asyncio.run(
            run_video_analysis(
                video_id=video_id,
                video_url=_s3_url(s3_key),
                policy_rules=policy_rules or [],
                frames=frames,
                transcript=transcript,
            )
        )
    except Exception as exc:
        logger.error("run_analysis_pipeline_task_error", video_id=video_id, error=str(exc))
        _set_video_status(video_id, VideoStatus.FAILED, error=str(exc))
        raise self.retry(exc=exc) from exc

    # Map AI decision to DB status
    _DECISION_TO_STATUS: dict[str, ModerationStatus] = {
        "approved": ModerationStatus.APPROVED,
        "rejected": ModerationStatus.REJECTED,
        "escalated": ModerationStatus.ESCALATED,
        "needs_review": ModerationStatus.ESCALATED,
    }
    mod_status = _DECISION_TO_STATUS.get(report.decision.value, ModerationStatus.PENDING)

    with sync_session() as db:
        existing = (
            db.query(ModerationResult)
            .filter(ModerationResult.video_id == uuid.UUID(video_id))
            .first()
        )
        if existing:
            existing.status = mod_status
            existing.overall_confidence = report.confidence
            existing.violations = [v.model_dump() for v in report.violations]
            existing.summary = report.content_summary
            existing.ai_model = settings.OPENAI_MODEL
            existing.updated_at = datetime.now(UTC)
        else:
            db.add(
                ModerationResult(
                    video_id=uuid.UUID(video_id),
                    status=mod_status,
                    overall_confidence=report.confidence,
                    violations=[v.model_dump() for v in report.violations],
                    summary=report.content_summary,
                    ai_model=settings.OPENAI_MODEL,
                )
            )

        # Mark video as ready
        video = db.get(Video, uuid.UUID(video_id))
        if video:
            video.status = VideoStatus.READY
            video.updated_at = datetime.now(UTC)

        # Capture result id for queue enqueue below
        result_id = str(existing.id) if existing else None
        if not result_id:
            # Re-fetch to get the generated id for the newly inserted row
            new_result = (
                db.query(ModerationResult)
                .filter(ModerationResult.video_id == uuid.UUID(video_id))
                .first()
            )
            result_id = str(new_result.id) if new_result else None

    # Enqueue for human review when decision needs escalation or is uncertain
    _NEEDS_REVIEW = {ModerationStatus.ESCALATED, ModerationStatus.PENDING}
    if mod_status in _NEEDS_REVIEW:
        from app.workers.moderation_tasks import enqueue_human_review_task

        enqueue_human_review_task.delay(
            video_id=video_id,
            moderation_result_id=result_id,
            priority=1 if mod_status == ModerationStatus.ESCALATED else 0,
        )

    logger.info(
        "run_analysis_pipeline_task_done",
        video_id=video_id,
        decision=report.decision.value,
        confidence=report.confidence,
    )
    return report.model_dump()


# ── W-02-E: Orchestrating entry point ─────────────────────────────────────────


@shared_task(
    bind=True,
    name="app.workers.video_tasks.process_video",
    max_retries=1,
    default_retry_delay=120,
)
def process_video(
    self,
    video_id: str,
    s3_key: str,
    policy_rules: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """
    Orchestrate the full video processing pipeline.

    Steps (sequential to share extracted artefacts):
        1. Mark video as PROCESSING
        2. Extract frames
        3. Transcribe audio
        4. Generate thumbnail
        5. Run full AI analysis pipeline

    Args:
        video_id:     UUID string of the video.
        s3_key:       S3 object key of the uploaded video file.
        policy_rules: Active policy rule dicts passed to the AI pipeline.

    Returns:
        The ModerationReport dict from the pipeline.
    """
    logger.info("process_video_start", video_id=video_id, s3_key=s3_key)
    _set_video_status(video_id, VideoStatus.PROCESSING)

    try:
        # Step 1 — frames
        frame_data: dict[str, Any] = extract_frames_task(video_id, s3_key)
        frames: list[str] = frame_data.get("frames", [])

        # Step 2 — transcript
        transcript_data: dict[str, Any] = transcribe_audio_task(video_id, s3_key)
        transcript: str = transcript_data.get("text", "")

        # Step 3 — thumbnail (best-effort; don't fail pipeline on error)
        try:
            generate_thumbnail_task(video_id, s3_key)
        except Exception as exc:
            logger.warning("process_video_thumbnail_failed", video_id=video_id, error=str(exc))

        # Step 4 — full AI analysis
        result = run_analysis_pipeline_task(
            video_id,
            s3_key,
            policy_rules=policy_rules,
            frames=frames,
            transcript=transcript,
        )

        logger.info("process_video_done", video_id=video_id)
        return result

    except Exception as exc:
        logger.error("process_video_failed", video_id=video_id, error=str(exc))
        _set_video_status(video_id, VideoStatus.FAILED, error=str(exc))
        raise self.retry(exc=exc) from exc
