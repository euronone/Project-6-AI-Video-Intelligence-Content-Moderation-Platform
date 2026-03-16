# Database Schema — VidShield AI

## 1. Overview

- **Database:** PostgreSQL 16.
- **ORM:** SQLAlchemy 2.0. **Migrations:** Alembic. All schema changes via migrations.
- **Conventions:** Every core table has `id` (UUID or bigint), `created_at`, `updated_at`. Use enums or constrained fields for status/type. Foreign keys and indexes for common filters and joins.

## 2. Core entities

### 2.1 users

- **Purpose:** Authentication and RBAC for dashboard and API (if user-scoped).
- **Columns (conceptual):** id, email, password_hash, role (enum: admin, operator, api_consumer), tenant_id (nullable, for multi-tenant), is_active, created_at, updated_at.
- **Indexes:** email (unique), tenant_id, role.

### 2.2 api_keys

- **Purpose:** Programmatic API access for platforms/partners.
- **Columns:** id, key_hash (hashed key), name, scopes (array or JSON), tenant_id (nullable), last_used_at, expires_at, created_at, updated_at.
- **Indexes:** key_hash lookup, tenant_id.

### 2.3 videos

- **Purpose:** Recorded video asset (upload or API-submitted).
- **Columns:** id, tenant_id (nullable), source (enum: upload, api), storage_key (S3 key or reference), filename, content_type, duration_seconds, status (enum: pending, processing, completed, failed), job_id (Celery), metadata (JSON), created_at, updated_at.
- **Indexes:** tenant_id, status, created_at, job_id.

### 2.4 live_streams

- **Purpose:** Live stream session.
- **Columns:** id, tenant_id, external_id or source_url, status (enum: active, stopped, failed), started_at, stopped_at, metadata (JSON), created_at, updated_at.
- **Indexes:** tenant_id, status, started_at.

### 2.5 moderation_results

- **Purpose:** One moderation result per video or stream run.
- **Columns:** id, video_id (FK nullable), stream_id (FK nullable), policy_id (FK), status (enum: pending, approved, rejected, escalated), overall_verdict, report (JSON: violations, timestamps, confidence, recommended_action), raw_metadata (JSON, optional), created_at, updated_at.
- **Constraints:** At least one of video_id or stream_id; check constraint or application logic.
- **Indexes:** video_id, stream_id, policy_id, status, created_at.

### 2.6 moderation_queue

- **Purpose:** Queue of items requiring or having had human review.
- **Columns:** id, moderation_result_id (FK), video_id (FK nullable), stream_id (FK nullable), status (enum: pending, in_review, resolved), priority, assigned_to (user_id FK nullable), resolution (enum: approve, reject, escalate), resolution_notes, resolved_at, created_at, updated_at.
- **Indexes:** status, priority, moderation_result_id, created_at.

### 2.7 policies

- **Purpose:** Moderation policy definition.
- **Columns:** id, tenant_id, name, description, categories (array or JSON), rules (JSON), actions (JSON: auto_flag, auto_reject, escalate thresholds), is_active, created_at, updated_at.
- **Indexes:** tenant_id, is_active.

### 2.8 alerts

- **Purpose:** Fired alerts (violation, backlog, pipeline failure).
- **Columns:** id, tenant_id, type (enum: violation, backlog, pipeline_failure, custom), severity, source_id (video_id or stream_id or job_id), payload (JSON), acknowledged, created_at, updated_at.
- **Indexes:** tenant_id, type, created_at, acknowledged.

### 2.9 webhook_endpoints

- **Purpose:** Outbound webhook configuration.
- **Columns:** id, tenant_id, url, secret (encrypted or hashed), events (array), is_active, last_delivery_at, last_status_code, created_at, updated_at.
- **Indexes:** tenant_id, is_active.

### 2.10 analytics / events (optional)

- **Purpose:** Pre-aggregated metrics or raw events for dashboards.
- **Options:** Either materialized/aggregate tables (e.g. daily_stats by tenant, policy) or append-only events table with columns: id, event_type, tenant_id, video_id/stream_id, payload, created_at. Index by event_type, tenant_id, created_at.
- **Align with observability and reporting requirements in PRD.**

## 3. Supporting / AI pipeline

### 3.1 jobs (optional)

- **Purpose:** Track Celery or async job status.
- **Columns:** id, type (video_processing, moderation_run, etc.), reference_id (video_id or stream_id), status, result (JSON), error_message, created_at, updated_at.
- **Indexes:** reference_id, status, type.

### 3.2 transcripts (optional)

- **Purpose:** Whisper transcript per video/segment.
- **Columns:** id, video_id (FK), stream_id (FK nullable), language, text (or storage_key if large), duration, created_at.
- **Indexes:** video_id, stream_id.

### 3.3 frames / artifacts (optional)

- **Purpose:** Reference to sampled frames or artifacts in S3 (if stored in DB).
- **Columns:** id, video_id or stream_id, frame_index or timestamp_sec, storage_key, created_at.
- **Indexes:** video_id, stream_id. Alternatively, store only in JSON on videos or moderation_results.

## 4. Multi-tenancy and RLS

- Where tenant_id exists, scope all tenant-scoped queries by tenant_id. Use Row Level Security (RLS) or repository-level filtering for multi-tenant isolation.
- API keys and users can be tenant-scoped; admin may have cross-tenant visibility per product requirements.

## 5. References

- **docs/PRD.md** — Features and entities.
- **docs/ARCHITECTURE.md** — Data access layer.
- **docs/API_SPEC.md** — IDs and semantics used in API.
- **CLAUDE.md** — Backend structure (models, repositories).
