# Architecture — VidShield AI

## 1. High-level overview

VidShield AI is a layered system: **frontend (Next.js)**, **backend (FastAPI)**, **workers (Celery)**, **AI pipeline (LangGraph + agents)**, **storage (PostgreSQL, Redis, S3, Pinecone)**, and **infrastructure (AWS)**. All application code follows clean architecture: thin routes, business logic in services, persistence in repositories, and AI orchestration in agents/graphs.

## 2. Tech stack (summary)

| Layer           | Technology |
|----------------|------------|
| Frontend       | Next.js 14 (App Router), React 18, Tailwind CSS 3, shadcn/ui, Zustand, React Query, Socket.IO client |
| Backend        | Python 3.12, FastAPI, Uvicorn, Celery, Redis, SQLAlchemy 2.0, Alembic |
| AI/ML          | OpenAI GPT-4o / GPT-4o-mini (vision + text), Whisper, LangChain 0.2+, LangGraph |
| Video          | FFmpeg, OpenCV, PyAV |
| Database       | PostgreSQL 16, Redis 7 (cache + broker), Pinecone (vector store) |
| Storage        | AWS S3 (video, thumbnails, artifacts) |
| Infrastructure | AWS ECS Fargate, ALB, CloudFront, RDS, ElastiCache, SQS, Lambda, ECR |
| CI/CD          | GitHub Actions, Docker, Terraform, AWS CDK |
| Monitoring     | CloudWatch, Prometheus, Grafana, Sentry |

## 3. Logical layers

### 3.1 Presentation

- **Web app (Next.js):** Single app hosting Admin and Dashboard; routes for auth, dashboard, videos, moderation, live, analytics, settings. Real-time updates via Socket.IO/WebSocket client.
- **API consumers:** REST and optional WebSocket to FastAPI; no UI in this repo.

### 3.2 API (FastAPI)

- **Routes:** `app/api/v1/` — auth, videos, moderation, analytics, live, policies, webhooks. Versioned under `/api/v1/`. Thin controllers; validation via Pydantic.
- **Error envelope:** Consistent structure `{ error: { code, message, details } }`; no internal stack traces to clients.

### 3.3 Services (business logic)

- **app/services/:** auth_service, video_service, moderation_service, analytics_service, storage_service, notification_service, stream_service. No DB or AI implementation details; use repositories and AI layer.

### 3.4 AI pipeline

- **app/ai/agents/:** orchestrator, content_analyzer, safety_checker, metadata_extractor, scene_classifier, report_generator.
- **app/ai/chains/:** moderation_chain, insight_chain, summary_chain.
- **app/ai/graphs/:** video_analysis_graph, moderation_workflow (LangGraph).
- **app/ai/tools/:** frame_extractor, audio_transcriber, ocr_tool, object_detector, similarity_search.
- **app/ai/prompts/:** templated prompts; no inline prompt strings in services.

### 3.5 Data access

- **Repositories / data layer:** All DB access via repositories; no raw SQL in routes or services. Align with docs/DB_SCHEMA.md.
- **PostgreSQL:** Primary store for users, videos, streams, moderation results, policies, alerts, analytics.
- **Redis:** Cache, rate limiting, Celery broker.
- **S3:** Video files, thumbnails, artifacts (presigned URLs for upload/download).
- **Pinecone:** Vector store for similarity search (e.g. known bad content, embeddings).

### 3.6 Workers (async)

- **Celery:** video_tasks (upload processing, frame extraction, transcription), moderation_tasks (run pipeline, update queue), analytics_tasks, cleanup_tasks. Broker: Redis; optional SQS for high throughput.

### 3.7 Core / cross-cutting

- **app/core/:** security (auth, RBAC), exceptions, middleware, logging. Config and dependencies in config.py and dependencies.py.

## 4. Data flow (typical)

1. **Upload:** Client obtains presigned S3 URL → uploads video → calls backend to register upload → backend enqueues Celery task → worker downloads/processes, extracts frames, runs Whisper → invokes LangGraph pipeline → stores results and artifacts → updates moderation queue / sends webhooks if configured.
2. **Live stream:** Stream registered → ingest segments/frames → pipeline runs (same or reduced graph) → results and alerts → WebSocket/dashboard and webhooks.
3. **API consumer:** Submits video ref via REST → same async pipeline; gets result via polling or webhook.

## 5. Interfaces

- **Admin (web):** Configuration, monitoring, API keys, tenant settings.
- **Dashboard (web):** Videos, moderation queue, policies, live, analytics.
- **API consumers:** REST + optional WebSocket; API keys or JWT. See docs/API_SPEC.md.

## 6. Conventions

- One API surface for web and API consumers; RBAC and scopes distinguish roles.
- Environment-driven config; no hardcoded secrets or resource IDs.
- Structured logging with correlation IDs; metrics for pipeline and API.
- New features go in the correct layer; naming and structure per CLAUDE.md and .cursor/rules.

## 7. References

- **CLAUDE.md** — Project structure and AI agent list.
- **docs/PRD.md** — Features and goals.
- **docs/API_SPEC.md** — API and webhooks.
- **docs/DB_SCHEMA.md** — Data model.
- **docs/DEPLOYMENT.md** — Infrastructure and deployment.
