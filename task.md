# VidShield AI — Feature Task Assignment

> **Branch Flow:** `feature/<name>` → `development` → `testing` → `main`
> All feature branches must be created from the `development` branch.
> Submit work via Pull Request to `development`. Do not commit directly to `main`.

---

## How to Start a Feature

```bash
git checkout development
git pull origin development
git checkout -b feature/<branch-name>
# ... do your work ...
git push origin feature/<branch-name>
# Open PR → base: development
```

---

## Feature Branches & Assignments

### FRONTEND

| # | Feature | Branch | Assignee | Status |
|---|---------|--------|----------|--------|
| F-01 | Authentication UI (Login & Register pages) | `feature/auth-ui` | | `[ ] Not Started` |
| F-02 | Dashboard Layout & Sidebar/Header/Footer components | `feature/dashboard-layout` | | `[ ] Not Started` |
| F-03 | Video List & Video Card components | `feature/video-list-ui` | | `[ ] Not Started` |
| F-04 | Video Upload (UploadDropzone + upload page) | `feature/video-upload-ui` | | `[ ] Not Started` |
| F-05 | Video Player with Timeline Annotation & Frame Inspector | `feature/video-player-ui` | | `[ ] Not Started` |
| F-06 | Moderation Queue & Review Panel UI | `feature/moderation-queue-ui` | | `[ ] Not Started` |
| F-07 | Policy Editor UI (`policies/page.tsx` + PolicyEditor component) | `feature/policy-editor-ui` | | `[ ] Not Started` |
| F-08 | ModerationBadge & ViolationCard components | `feature/moderation-components` | | `[ ] Not Started` |
| F-09 | Analytics Dashboard (InsightChart, HeatmapOverlay, StatCard) | `feature/analytics-ui` | | `[ ] Not Started` |
| F-10 | Live Stream Monitor (StreamMonitor, LiveFeed, AlertBanner) | `feature/live-stream-ui` | | `[ ] Not Started` |
| F-11 | Frontend State Management (Zustand stores: auth, video, moderation) | `feature/frontend-stores` | | `[ ] Not Started` |
| F-12 | WebSocket / Socket.IO client integration (`useWebSocket` hook + `socket.ts`) | `feature/websocket-client` | | `[ ] Not Started` |
| F-13 | React Query hooks (useVideo, useModeration, useAnalytics) | `feature/frontend-hooks` | | `[ ] Not Started` |
| F-14 | API proxy route & base API client (`lib/api.ts` + `[...proxy]/route.ts`) | `feature/api-client` | | `[ ] Not Started` |
| F-15 | TypeScript type definitions (video, moderation, analytics, user) | `feature/frontend-types` | | `[ ] Not Started` |

---

### BACKEND — API Layer

| # | Feature | Branch | Assignee | Status |
|---|---------|--------|----------|--------|
| B-01 | Authentication API (`auth.py`) — register, login, JWT, refresh | `feature/auth-api` | | `[ ] Not Started` |
| B-02 | Video API (`videos.py`) — CRUD, upload, status endpoints | `feature/video-api` | | `[ ] Not Started` |
| B-03 | Moderation API (`moderation.py`) — results, review, override endpoints | `feature/moderation-api` | | `[ ] Not Started` |
| B-04 | Analytics API (`analytics.py`) — metrics, reports, aggregation endpoints | `feature/analytics-api` | | `[ ] Not Started` |
| B-05 | Live Stream API (`live.py`) — stream ingest, status, real-time events | `feature/live-api` | | `[ ] Not Started` |
| B-06 | Policies API (`policies.py`) — CRUD for moderation rule sets | `feature/policies-api` | | `[ ] Not Started` |
| B-07 | Webhooks API (`webhooks.py`) — outbound event delivery | `feature/webhooks-api` | | `[ ] Not Started` |

---

### BACKEND — Services Layer

| # | Feature | Branch | Assignee | Status |
|---|---------|--------|----------|--------|
| S-01 | Auth Service (`auth_service.py`) — password hashing, token management | `feature/auth-service` | | `[ ] Not Started` |
| S-02 | Video Service (`video_service.py`) — business logic for video lifecycle | `feature/video-service` | | `[ ] Not Started` |
| S-03 | Moderation Service (`moderation_service.py`) — decision engine, rule evaluation | `feature/moderation-service` | | `[ ] Not Started` |
| S-04 | Analytics Service (`analytics_service.py`) — aggregation, trend calculation | `feature/analytics-service` | | `[ ] Not Started` |
| S-05 | Storage Service (`storage_service.py`) — AWS S3 upload/download/presigned URLs | `feature/storage-service` | | `[ ] Not Started` |
| S-06 | Notification Service (`notification_service.py`) — alerts, email, webhook dispatch | `feature/notification-service` | | `[ ] Not Started` |
| S-07 | Stream Service (`stream_service.py`) — live stream ingestion & management | `feature/stream-service` | | `[ ] Not Started` |

---

### BACKEND — Database Models & Migrations

| # | Feature | Branch | Assignee | Status |
|---|---------|--------|----------|--------|
| D-01 | User model & Pydantic schema | `feature/user-model` | | `[ ] Not Started` |
| D-02 | Video model & Pydantic schema | `feature/video-model` | | `[ ] Not Started` |
| D-03 | Moderation model & Pydantic schema | `feature/moderation-model` | | `[ ] Not Started` |
| D-04 | Policy model & Pydantic schema | `feature/policy-model` | | `[ ] Not Started` |
| D-05 | Analytics model & Pydantic schema | `feature/analytics-model` | | `[ ] Not Started` |
| D-06 | Alert model | `feature/alert-model` | | `[ ] Not Started` |
| D-07 | Alembic migrations (initial schema + subsequent revisions) | `feature/db-migrations` | | `[ ] Not Started` |

---

### AI / ML — Agents

| # | Feature | Branch | Assignee | Status |
|---|---------|--------|----------|--------|
| A-01 | Orchestrator Agent (`orchestrator.py`) — LangGraph entry point, task delegation | `feature/ai-orchestrator` | | `[ ] Not Started` |
| A-02 | Content Analyzer Agent (`content_analyzer.py`) — GPT-4o vision on sampled frames | `feature/ai-content-analyzer` | | `[ ] Not Started` |
| A-03 | Safety Checker Agent (`safety_checker.py`) — policy-aware moderation decisions | `feature/ai-safety-checker` | | `[ ] Not Started` |
| A-04 | Metadata Extractor Agent (`metadata_extractor.py`) — entities, topics, brands, OCR | `feature/ai-metadata-extractor` | | `[ ] Not Started` |
| A-05 | Scene Classifier Agent (`scene_classifier.py`) — violence, nudity, drugs, hate symbols | `feature/ai-scene-classifier` | | `[ ] Not Started` |
| A-06 | Report Generator Agent (`report_generator.py`) — synthesizes all agent outputs | `feature/ai-report-generator` | | `[ ] Not Started` |

---

### AI / ML — Chains & Graphs

| # | Feature | Branch | Assignee | Status |
|---|---------|--------|----------|--------|
| C-01 | Moderation Chain (`moderation_chain.py`) — LangChain moderation pipeline | `feature/moderation-chain` | | `[ ] Not Started` |
| C-02 | Insight Chain (`insight_chain.py`) — content insight extraction chain | `feature/insight-chain` | | `[ ] Not Started` |
| C-03 | Summary Chain (`summary_chain.py`) — video summarization chain | `feature/summary-chain` | | `[ ] Not Started` |
| C-04 | Video Analysis Graph (`video_analysis_graph.py`) — LangGraph DAG for full analysis | `feature/video-analysis-graph` | | `[ ] Not Started` |
| C-05 | Moderation Workflow Graph (`moderation_workflow.py`) — LangGraph moderation DAG | `feature/moderation-workflow-graph` | | `[ ] Not Started` |

---

### AI / ML — Tools & Prompts

| # | Feature | Branch | Assignee | Status |
|---|---------|--------|----------|--------|
| T-01 | Frame Extractor Tool (`frame_extractor.py`) — FFmpeg/OpenCV frame sampling | `feature/tool-frame-extractor` | | `[ ] Not Started` |
| T-02 | Audio Transcriber Tool (`audio_transcriber.py`) — OpenAI Whisper integration | `feature/tool-audio-transcriber` | | `[ ] Not Started` |
| T-03 | OCR Tool (`ocr_tool.py`) — on-frame text extraction | `feature/tool-ocr` | | `[ ] Not Started` |
| T-04 | Object Detector Tool (`object_detector.py`) — object/scene detection in frames | `feature/tool-object-detector` | | `[ ] Not Started` |
| T-05 | Similarity Search Tool (`similarity_search.py`) — Pinecone vector search | `feature/tool-similarity-search` | | `[ ] Not Started` |
| T-06 | Moderation Prompts (`moderation_prompts.py`) | `feature/prompts-moderation` | | `[ ] Not Started` |
| T-07 | Analysis Prompts (`analysis_prompts.py`) | `feature/prompts-analysis` | | `[ ] Not Started` |
| T-08 | Summary Prompts (`summary_prompts.py`) | `feature/prompts-summary` | | `[ ] Not Started` |

---

### WORKERS — Celery Background Tasks

| # | Feature | Branch | Assignee | Status |
|---|---------|--------|----------|--------|
| W-01 | Celery App setup (`celery_app.py`) — broker config, task routing | `feature/celery-setup` | | `[ ] Not Started` |
| W-02 | Video Tasks (`video_tasks.py`) — async video processing pipeline | `feature/worker-video-tasks` | | `[ ] Not Started` |
| W-03 | Moderation Tasks (`moderation_tasks.py`) — async AI moderation pipeline | `feature/worker-moderation-tasks` | | `[ ] Not Started` |
| W-04 | Analytics Tasks (`analytics_tasks.py`) — async metrics aggregation | `feature/worker-analytics-tasks` | | `[ ] Not Started` |
| W-05 | Cleanup Tasks (`cleanup_tasks.py`) — S3 artifact & DB record cleanup | `feature/worker-cleanup-tasks` | | `[ ] Not Started` |

---

### INFRASTRUCTURE & DEVOPS

| # | Feature | Branch | Assignee | Status |
|---|---------|--------|----------|--------|
| I-01 | Terraform VPC & Networking module | `feature/tf-vpc` | | `[ ] Not Started` |
| I-02 | Terraform ECS Fargate module (backend + worker services) | `feature/tf-ecs` | | `[ ] Not Started` |
| I-03 | Terraform RDS (PostgreSQL 16) module | `feature/tf-rds` | | `[ ] Not Started` |
| I-04 | Terraform ElastiCache (Redis 7) module | `feature/tf-elasticache` | | `[ ] Not Started` |
| I-05 | Terraform S3 & CloudFront module | `feature/tf-s3-cloudfront` | | `[ ] Not Started` |
| I-06 | Terraform SQS module | `feature/tf-sqs` | | `[ ] Not Started` |
| I-07 | Terraform Monitoring module (CloudWatch, Prometheus, Grafana) | `feature/tf-monitoring` | | `[ ] Not Started` |
| I-08 | Docker Compose — local dev environment | `feature/docker-compose-dev` | | `[ ] Not Started` |
| I-09 | Docker Compose — production environment | `feature/docker-compose-prod` | | `[ ] Not Started` |
| I-10 | CI GitHub Actions workflow (`ci.yml`) — lint, test, build | `feature/ci-pipeline` | | `[ ] Not Started` |
| I-11 | CD Staging GitHub Actions workflow (`cd-staging.yml`) | `feature/cd-staging-pipeline` | | `[ ] Not Started` |
| I-12 | CD Production GitHub Actions workflow (`cd-prod.yml`) | `feature/cd-prod-pipeline` | | `[ ] Not Started` |
| I-13 | Backend core — security, middleware, exceptions, logging | `feature/backend-core` | | `[ ] Not Started` |

---

## Summary

| Area | Feature Count |
|------|--------------|
| Frontend | 15 |
| Backend API | 7 |
| Backend Services | 7 |
| Database Models | 7 |
| AI Agents | 6 |
| AI Chains & Graphs | 5 |
| AI Tools & Prompts | 8 |
| Celery Workers | 5 |
| Infrastructure & DevOps | 13 |
| **Total** | **73** |

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| `[ ] Not Started` | Branch not yet created |
| `[~] In Progress` | Branch created, work ongoing |
| `[R] In Review` | PR open, awaiting review |
| `[✓] Merged` | Merged into `development` |

---

*Last updated: 2026-03-16*
