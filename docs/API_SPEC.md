# API Specification — VidShield AI

## 1. Overview

- **Base URL:** `https://api.<env>.vidshield.ai` (or configured host). Versioned under `/api/v1/`.
- **Auth:** API key (header `X-API-Key` or `Authorization: Bearer <key>`) or JWT for user/dashboard. Admin/operator endpoints require appropriate role.
- **Response envelope:** Success: `{ "data": ... }`. Error: `{ "error": { "code": "...", "message": "...", "details": {} } }`.
- **Status codes:** 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Too Many Requests, 500 Internal Server Error.

## 2. Authentication

### 2.1 API key (programmatic)

- **Header:** `X-API-Key: <key>` or `Authorization: Bearer <key>`.
- Used by platform/partner integrations. Scopes (if supported): e.g. `videos:write`, `moderation:read`, `webhooks:manage`.
- Rate limits per key; audit log for usage.

### 2.2 JWT (web dashboard / operator)

- **Login:** `POST /api/v1/auth/login` — body `{ "email", "password" }` → returns `{ "access_token", "refresh_token", "expires_in" }`.
- **Refresh:** `POST /api/v1/auth/refresh` — body `{ "refresh_token" }`.
- **Protected routes:** `Authorization: Bearer <access_token>`.
- RBAC: admin vs operator; enforced per endpoint.

## 3. Videos

- **List:** `GET /api/v1/videos` — query: `page`, `page_size`, `status`, `tenant_id` (if multi-tenant). Returns paginated list.
- **Get:** `GET /api/v1/videos/{id}` — single video with metadata, status, and references to moderation result if any.
- **Register upload:** `POST /api/v1/videos` — body: `{ "source": "upload", "storage_key" | "s3_key", "filename", "content_type", ... }` → creates record and enqueues processing job; returns `video_id`, `job_id`.
- **Presigned upload URL:** `POST /api/v1/videos/upload-url` — body `{ "filename", "content_type", "size" }` → returns `{ "upload_url", "video_id", "expires_at" }`; client uploads to S3 then calls register or callback.
- **Delete:** `DELETE /api/v1/videos/{id}` — soft or hard delete per policy; requires auth.

## 4. Moderation

- **Queue list:** `GET /api/v1/moderation/queue` — query: `page`, `page_size`, `status` (pending, in_review, resolved), `priority`. Returns queue items (video/stream refs + moderation summary).
- **Result by video:** `GET /api/v1/moderation/videos/{video_id}` — full moderation result and report for a video.
- **Result by stream:** `GET /api/v1/moderation/streams/{stream_id}` — result for live stream.
- **Submit for review / override:** `POST /api/v1/moderation/queue/{id}/review` — body `{ "action": "approve" | "reject" | "escalate", "notes" }` — operator override; audit logged.
- **Report (structured):** Included in moderation result: violations (category, timestamp, confidence, snippet), recommended_action, policy_id.

## 5. Policies

- **List:** `GET /api/v1/policies` — query: `page`, `page_size`, `tenant_id`. Returns policy list.
- **Get:** `GET /api/v1/policies/{id}`.
- **Create:** `POST /api/v1/policies` — body: name, description, categories, rules, actions (auto_flag, auto_reject, escalate), thresholds. Returns policy.
- **Update:** `PATCH /api/v1/policies/{id}`.
- **Delete:** `DELETE /api/v1/policies/{id}`.

## 6. Live streams

- **List:** `GET /api/v1/live/streams` — query: `page`, `page_size`, `status`.
- **Get:** `GET /api/v1/live/streams/{stream_id}` — status, health, latest alerts.
- **Register:** `POST /api/v1/live/streams` — body: source URL/key, metadata → returns `stream_id`; backend starts or links ingestion.
- **Stop:** `POST /api/v1/live/streams/{stream_id}/stop`.
- **WebSocket (optional):** e.g. `wss://api.<env>.vidshield.ai/ws/live/{stream_id}` — real-time status and alerts (document exact path and message schema in implementation).

## 7. Analytics

- **Summary:** `GET /api/v1/analytics/summary` — query: `from`, `to`, `tenant_id`. Returns aggregates: processed count, violation rate, latency percentiles.
- **By policy/category:** `GET /api/v1/analytics/violations` — query: `from`, `to`, `policy_id`, `category`. Returns time-series or breakdown.
- **Export (optional):** `GET /api/v1/analytics/export` — query params for format (e.g. CSV), date range; returns file or download URL.

## 8. Webhooks

- **Outbound (platform):** VidShield sends POST to configured URL on events: `moderation.completed`, `violation.detected`, `alert.triggered`, `stream.status`. Payload includes event type, ids, timestamp, signature (e.g. HMAC). Retries with backoff; document payload schema per event.
- **Inbound (optional):** e.g. `POST /api/v1/webhooks/ingestion` — upload complete or stream event; validate signature; idempotency key in header.
- **Manage endpoints:** `GET/POST/PATCH/DELETE /api/v1/webhooks/endpoints` — CRUD for outbound webhook URLs and secrets (admin/operator).

## 9. Admin / system (optional)

- **API keys:** `GET/POST/DELETE /api/v1/admin/api-keys` — list, create, revoke (admin only).
- **Health:** `GET /api/v1/health` — returns service and dependency status (no auth required for load balancer).

## 10. Mobile / partner specifics

- If a native mobile or partner app is added: use same REST + WebSocket; document any mobile-specific headers (e.g. `X-Client: mobile`, `X-App-Version`) and push/offline behavior in a future appendix or separate doc.

## 11. References

- **docs/PRD.md** — Feature list.
- **docs/ARCHITECTURE.md** — Backend and layer design.
- **docs/DB_SCHEMA.md** — Entity and ID semantics.
- **docs/DEPLOYMENT.md** — Environments and URLs.
