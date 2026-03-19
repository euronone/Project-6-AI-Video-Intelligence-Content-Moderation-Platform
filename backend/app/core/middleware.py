import time
import uuid

import orjson
import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

logger = structlog.get_logger(__name__)

_SKIP_PATHS = frozenset({"/health", "/docs", "/redoc", "/openapi.json"})


class DataWrapperMiddleware(BaseHTTPMiddleware):
    """Wrap all successful JSON responses in {\"data\": ...} envelope.

    This keeps the API response shape consistent with the frontend's
    expectation of { data: { ... } } for all 2xx responses.
    Error responses already use { error: { code, message } } and are not wrapped.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)

        content_type = response.headers.get("content-type", "")
        if (
            not (200 <= response.status_code < 300)
            or "application/json" not in content_type
            or request.url.path in _SKIP_PATHS
        ):
            return response

        # Consume the body
        chunks: list[bytes] = []
        async for chunk in response.body_iterator:
            chunks.append(chunk if isinstance(chunk, bytes) else chunk.encode())
        body = b"".join(chunks)

        try:
            payload = orjson.loads(body)
            # Don't double-wrap if already has data/error key
            if isinstance(payload, dict) and ("data" in payload or "error" in payload):
                return Response(
                    content=body,
                    status_code=response.status_code,
                    media_type="application/json",
                    headers=dict(response.headers),
                )
            wrapped = orjson.dumps({"data": payload})
            headers = dict(response.headers)
            headers["content-length"] = str(len(wrapped))
            return Response(
                content=wrapped,
                status_code=response.status_code,
                media_type="application/json",
                headers=headers,
            )
        except Exception:
            return Response(
                content=body,
                status_code=response.status_code,
                media_type="application/json",
                headers=dict(response.headers),
            )


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Attaches a unique request_id to every request and logs method/path/status/duration."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = str(uuid.uuid4())
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        start = time.perf_counter()
        response: Response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        logger.info(
            "http_request",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
        )

        response.headers["X-Request-ID"] = request_id
        return response
