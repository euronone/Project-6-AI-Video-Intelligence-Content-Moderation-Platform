from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from app.api.v1.router import api_router
from app.config import settings
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.logging import setup_logging
from app.core.middleware import DataWrapperMiddleware, RequestContextMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    setup_logging()
    yield
    # Cleanup on shutdown (close DB engine, Redis pool, etc.)
    from app.dependencies import _engine, _redis

    if _engine:
        await _engine.dispose()
    if _redis:
        await _redis.aclose()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        description="AI Video Intelligence & Content Moderation Platform — Backend API",
        version="0.1.0",
        docs_url="/docs" if settings.APP_ENV != "production" else None,
        redoc_url="/redoc" if settings.APP_ENV != "production" else None,
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
    )

    # ── Middleware ────────────────────────────────────────────────────────────
    app.add_middleware(DataWrapperMiddleware)
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Exception handlers ────────────────────────────────────────────────────
    app.add_exception_handler(AppException, app_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_exception_handler)

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(api_router)

    # ── Health check ──────────────────────────────────────────────────────────
    @app.get("/health", tags=["ops"], include_in_schema=False)
    async def health() -> dict:
        return {"status": "ok", "env": settings.APP_ENV}

    return app


app = create_app()
