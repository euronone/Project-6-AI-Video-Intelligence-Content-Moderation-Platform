"""
W-01 Celery Application

Initialises the Celery app, configures broker/backend from settings,
defines task routing, shared task defaults, structured logging signals,
and exposes a sync SQLAlchemy session factory for use in worker tasks.

Usage:
    from app.workers.celery_app import celery_app, sync_session

Worker startup:
    celery -A app.workers.celery_app worker --queues video,moderation,analytics,cleanup
"""
from __future__ import annotations

from contextlib import contextmanager
from typing import Generator

import structlog
from celery import Celery
from celery.signals import task_failure, task_postrun, task_prerun, task_retry
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings

logger = structlog.get_logger(__name__)

# ── Celery app ─────────────────────────────────────────────────────────────────

celery_app = Celery("vidshield")

celery_app.conf.update(
    # Broker & backend
    broker_url=settings.CELERY_BROKER_URL,
    result_backend=settings.CELERY_RESULT_BACKEND,

    # Serialisation
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,

    # Reliability
    task_acks_late=True,
    task_reject_on_worker_lost=True,

    # Default retry policy
    task_max_retries=3,
    task_default_retry_delay=60,  # seconds

    # Task routing: each domain gets its own queue
    task_routes={
        "app.workers.video_tasks.*": {"queue": "video"},
        "app.workers.moderation_tasks.*": {"queue": "moderation"},
        "app.workers.analytics_tasks.*": {"queue": "analytics"},
        "app.workers.cleanup_tasks.*": {"queue": "cleanup"},
    },

    # Result expiry (24 h)
    result_expires=86_400,
)

celery_app.autodiscover_tasks(
    [
        "app.workers.video_tasks",
        "app.workers.moderation_tasks",
        "app.workers.analytics_tasks",
        "app.workers.cleanup_tasks",
    ]
)


# ── Sync DB session factory ────────────────────────────────────────────────────
# Celery tasks are synchronous; use the psycopg2 URL for blocking access.

_engine = create_engine(
    settings.DATABASE_URL_SYNC,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)
_SessionFactory = sessionmaker(bind=_engine, autocommit=False, autoflush=False)


@contextmanager
def sync_session() -> Generator[Session, None, None]:
    """Context manager that yields a SQLAlchemy sync session and auto-commits or rolls back."""
    session: Session = _SessionFactory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


# ── Structured logging signals ─────────────────────────────────────────────────

@task_prerun.connect
def _on_task_prerun(task_id: str, task, args, kwargs, **_kw) -> None:
    logger.info("celery_task_start", task_id=task_id, task_name=task.name)


@task_postrun.connect
def _on_task_postrun(task_id: str, task, retval, state, **_kw) -> None:
    logger.info("celery_task_done", task_id=task_id, task_name=task.name, state=state)


@task_retry.connect
def _on_task_retry(request, reason, einfo, **_kw) -> None:
    logger.warning(
        "celery_task_retry",
        task_id=request.id,
        task_name=request.task,
        reason=str(reason),
    )


@task_failure.connect
def _on_task_failure(task_id: str, exception, traceback, sender, **_kw) -> None:
    logger.error(
        "celery_task_failed",
        task_id=task_id,
        task_name=sender.name,
        error=str(exception),
    )
