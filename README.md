# VidShield AI — Video Intelligence & Content Moderation Platform

[![CI](https://github.com/euronone/Project-6-AI-Video-Intelligence-Content-Moderation-Platform/actions/workflows/ci.yml/badge.svg)](https://github.com/euronone/Project-6-AI-Video-Intelligence-Content-Moderation-Platform/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue)](https://www.python.org/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)

---

## Overview

VidShield AI is an enterprise-grade, AI-powered Video Intelligence and Content Moderation Platform. It analyzes both live and recorded video content for safety violations, extracts rich metadata, classifies scenes, and delivers structured moderation reports — all with zero human intervention by default.

The platform is built around a **multi-agent AI pipeline** orchestrated by LangGraph, enabling autonomous decision-making at scale. Operators retain full control through configurable policies, a real-time monitoring dashboard, and optional human review escalation.

---

## The Problem

Digital platforms publishing user-generated video content face an accelerating moderation challenge:

- Hours of video are uploaded every minute across major platforms.
- Manual review is slow, expensive, inconsistent, and psychologically taxing on reviewers.
- Regulatory and compliance requirements (GDPR, DSA, CSAM detection mandates) demand faster and more auditable enforcement.
- Reactive moderation — acting after violations are reported — causes reputational and legal harm.

VidShield AI addresses this by shifting the model from reactive to **proactive, policy-driven, AI-enforced moderation**.

---

## Real-World Use Cases

| Sector | Application |
|--------|-------------|
| Video Platforms (YouTube-like) | Automated pre-publication review; violation flagging before content goes live |
| EdTech | Safe learning environment enforcement; detection of inappropriate content in student-uploaded videos |
| Social Media | Real-time live stream monitoring; instant alert and takedown for hate speech, violence, or self-harm content |
| Enterprise / Internal Comms | Compliance screening for recorded meetings, training content, or public webinars |
| Surveillance & Security | Scene classification and anomaly detection in CCTV or body-cam footage |
| Gaming & Live Broadcasting | Real-time moderation of streamer content; brand-safe enforcement for advertising partners |

---

## Scope

### In Scope

- Video ingestion via file upload, presigned S3 URL, or REST API submission
- Live stream ingestion and near-real-time analysis via WebSocket
- Multi-agent AI pipeline: frame analysis, audio transcription (Whisper), OCR, object detection, scene classification
- Policy-driven moderation engine with configurable rules, thresholds, and auto-actions
- Structured moderation reports with violation timestamps, confidence scores, and recommended actions
- Human review queue with priority management and audit trail
- Analytics dashboard: throughput, violation rates, policy effectiveness, latency
- Outbound webhooks for moderation results, alerts, and stream events
- Role-based access control (Admin, Operator)
- Multi-tenant architecture with per-tenant policy isolation

### Out of Scope

- Native mobile application
- Customer support or chat-based interfaces
- SMS / WhatsApp notification channels

---

## Industry Value

**Compliance and Risk Reduction**
Platforms operating under DSA, GDPR, or national content regulations face liability for delayed moderation. VidShield AI provides a documented, auditable decision trail for every piece of content processed.

**Cost Efficiency**
Replacing or augmenting a large manual review team with an autonomous AI layer reduces per-moderation cost significantly while increasing throughput.

**Consistency and Accuracy**
AI-enforced policies eliminate reviewer fatigue and inconsistency. Confidence thresholds and per-category rules let operators tune precision vs. recall per use case.

**Scalability**
Built on AWS ECS Fargate and Celery task queues, the platform scales horizontally to handle spikes in video submissions without infrastructure changes.

**Speed to Action**
From video upload to moderation report: typically under 60 seconds for standard-length content, with live stream alerts delivered in near-real-time.

---

## Architecture

### System Overview

```mermaid
graph TB
    subgraph Client ["Client Layer"]
        FE["Next.js 14 Dashboard\n(React 18 + Tailwind CSS)"]
    end

    subgraph Gateway ["Gateway Layer"]
        ALB["AWS ALB\n(Load Balancer)"]
        CF["CloudFront CDN"]
    end

    subgraph Backend ["Backend Layer (AWS ECS Fargate)"]
        API["FastAPI + Uvicorn\n/api/v1/"]
        WS["WebSocket Server\n(Socket.IO)"]
        WORKER["Celery Workers\n(Video + Moderation + Analytics)"]
    end

    subgraph AI ["AI Pipeline (LangGraph)"]
        ORCH["Orchestrator Agent"]
        CA["Content Analyzer\n(GPT-4o Vision)"]
        SC["Safety Checker\n(Policy-Aware)"]
        ME["Metadata Extractor\n(OCR + NLP)"]
        CLS["Scene Classifier"]
        RG["Report Generator"]
    end

    subgraph Tools ["AI Tools"]
        FX["Frame Extractor\n(FFmpeg / OpenCV)"]
        AT["Audio Transcriber\n(Whisper)"]
        OD["Object Detector"]
        OCR["OCR Tool"]
        SS["Similarity Search\n(Pinecone)"]
    end

    subgraph Storage ["Data Layer"]
        PG[("PostgreSQL 16\n(RDS)")]
        REDIS[("Redis 7\n(ElastiCache)")]
        S3["AWS S3\n(Video + Artifacts)"]
        PC["Pinecone\n(Vector Store)"]
    end

    subgraph Infra ["Infrastructure"]
        SQS["AWS SQS"]
        CW["CloudWatch + Grafana"]
        SENTRY["Sentry"]
        SECRETS["AWS Secrets Manager"]
    end

    FE -->|HTTPS REST + WS| CF
    CF --> ALB
    ALB --> API
    ALB --> WS
    API --> WORKER
    API --> PG
    API --> REDIS
    WORKER --> ORCH
    ORCH --> CA
    ORCH --> SC
    ORCH --> ME
    ORCH --> CLS
    ORCH --> RG
    CA --> FX
    CA --> AT
    ME --> OCR
    ME --> OD
    SC --> SS
    SS --> PC
    WORKER --> S3
    WORKER --> PG
    WORKER --> REDIS
    API --> SQS
    CW --> API
    SENTRY --> API
```

### AI Agent Pipeline

```mermaid
sequenceDiagram
    participant Client
    participant API as FastAPI
    participant Queue as Celery / Redis
    participant Orch as Orchestrator
    participant CA as Content Analyzer
    participant SC as Safety Checker
    participant ME as Metadata Extractor
    participant RG as Report Generator
    participant DB as PostgreSQL

    Client->>API: POST /api/v1/videos/upload
    API->>DB: Create video record (pending)
    API->>Queue: Dispatch video_analysis_task
    API-->>Client: 202 Accepted { video_id }

    Queue->>Orch: Execute pipeline
    Orch->>CA: Analyze sampled frames (GPT-4o Vision)
    CA-->>Orch: Scene descriptions + content flags
    Orch->>ME: Extract metadata (OCR, entities, brands)
    ME-->>Orch: Structured metadata
    Orch->>SC: Evaluate against active policies
    SC-->>Orch: Violations + confidence scores
    Orch->>RG: Generate moderation report
    RG-->>Orch: Structured report

    Orch->>DB: Persist ModerationResult
    Orch->>Queue: Notify via WebSocket
    Queue-->>Client: Real-time status update
```

### Moderation Decision Flow

```mermaid
flowchart TD
    A[Video Submitted] --> B[Frame Extraction + Transcription]
    B --> C[Multi-Agent Analysis]
    C --> D{Policy Match?}
    D -->|No violation| E[Auto-Approve]
    D -->|Below threshold| F[Flag for Review]
    D -->|Exceeds threshold + action = block| G[Auto-Reject]
    D -->|Escalate rule| H[Add to Human Review Queue]
    F --> I{Human Reviewer}
    H --> I
    I -->|Approve| J[Mark Approved]
    I -->|Reject| K[Mark Rejected]
    I -->|Escalate| L[Senior Review]
    E --> M[Webhook Notification]
    G --> M
    J --> M
    K --> M
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS 3, shadcn/ui, Zustand, React Query, Socket.IO client |
| Backend | Python 3.12, FastAPI, Uvicorn, Celery, SQLAlchemy 2.0 (async), Alembic |
| AI / ML | OpenAI GPT-4o / GPT-4o-mini (vision + text), OpenAI Whisper, LangChain 0.2+, LangGraph |
| Video Processing | FFmpeg, OpenCV, PyAV |
| Databases | PostgreSQL 16 (primary), Redis 7 (cache + broker), Pinecone (vector store) |
| Storage | AWS S3 (video, thumbnails, artifacts) |
| Infrastructure | AWS ECS Fargate, ALB, CloudFront, RDS, ElastiCache, SQS, Lambda, ECR |
| CI / CD | GitHub Actions, Docker, Terraform |
| Monitoring | CloudWatch, Prometheus, Grafana, Sentry |

---

## Key Features

**Autonomous Moderation Pipeline**
Zero human intervention required for standard decisions. The LangGraph orchestrator coordinates six specialized agents and resolves a final verdict in a single pipeline run.

**Configurable Policy Engine**
Operators define rules per content category (violence, nudity, drugs, hate symbols, spam, misinformation) with per-category confidence thresholds and actions (block, flag, allow). Policies are versioned and tenant-scoped.

**Live Stream Monitoring**
Ingest and analyze live streams with WebSocket-delivered real-time alerts. Dashboard shows live feeds, stream health, and active violation banners.

**Multi-Tenant RBAC**
Admin and Operator roles. Each tenant sees only their own content, policies, and moderation results.

**Audit Trail**
Every moderation decision — automated or human — is logged with actor, timestamp, policy version, and outcome. Supports compliance export.

**Webhook Integrations**
Outbound webhooks for moderation results, violation events, stream status changes, and alert notifications. Signed payloads, retry logic, configurable endpoints.

---

## Project Structure

```
vidshield-ai/
├── backend/                        # Python / FastAPI application
│   ├── app/
│   │   ├── ai/
│   │   │   ├── agents/             # Orchestrator, Analyzer, Checker, Extractor, Classifier, Reporter
│   │   │   ├── chains/             # LangChain chains (moderation, insight, summary)
│   │   │   ├── graphs/             # LangGraph workflow definitions
│   │   │   ├── tools/              # Frame extractor, Whisper, OCR, object detector, Pinecone
│   │   │   └── prompts/            # Prompt templates per agent
│   │   ├── api/v1/                 # REST endpoints: auth, videos, moderation, policies, live, analytics
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   ├── schemas/                # Pydantic request / response schemas
│   │   ├── services/               # Business logic layer
│   │   ├── workers/                # Celery task definitions
│   │   └── core/                   # Security, middleware, exceptions, logging
│   └── tests/                      # pytest: API, services, AI, workers
├── frontend/                       # Next.js 14 application
│   └── src/
│       ├── app/                    # App Router pages (dashboard, videos, moderation, live)
│       ├── components/             # UI components (video, moderation, analytics, live, layout)
│       ├── hooks/                  # React Query hooks
│       ├── stores/                 # Zustand state stores
│       ├── types/                  # TypeScript interfaces
│       └── lib/                    # API client, socket, utilities
├── terraform/                      # Infrastructure as Code (AWS)
│   └── modules/                    # VPC, ECS, RDS, ElastiCache, S3, CloudFront, SQS, monitoring
├── .github/workflows/              # CI, CD staging, CD production pipelines
├── docker-compose.yml              # Local development stack
└── docs/                           # PRD, architecture, API spec, DB schema, deployment guide
```

---

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local frontend development without Docker)
- Python 3.12+ (for local backend development without Docker)
- An OpenAI API key

### Environment Setup

Copy the example environment files and fill in values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Minimum required variables for local development:

```env
# backend/.env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/vidshield
REDIS_URL=redis://redis:6379/0
SECRET_KEY=your-secret-key-min-32-chars
OPENAI_API_KEY=sk-...

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=http://localhost:8000
```

### Run with Docker Compose

```bash
# Start all services (PostgreSQL, Redis, Backend, Celery Worker, Frontend)
docker compose up -d

# Run database migrations
docker compose exec backend alembic upgrade head

# Seed the default admin user
docker compose exec backend python scripts/seed_admin.py
```

| Service | URL |
|---------|-----|
| Frontend dashboard | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |
| API docs (ReDoc) | http://localhost:8000/redoc |

### Default Credentials (development only)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@vidshield.ai | Admin123! |
| Operator | operator@vidshield.ai | Operator123! |

---

## Development Commands

```bash
# Start all services
make dev

# Run all tests
make test

# Run backend tests only
make test-backend

# Run linters
make lint

# Database migrations
make db-migrate
make db-revision MSG="add_column_to_videos"

# Infrastructure
make tf-plan ENV=dev
make tf-apply ENV=dev
```

---

## API Reference

All endpoints are versioned under `/api/v1/`. Authentication uses JWT bearer tokens.

| Resource | Endpoint | Description |
|----------|----------|-------------|
| Auth | `POST /auth/login` | Obtain access + refresh tokens |
| Videos | `GET/POST /videos` | List videos or submit for analysis |
| Videos | `GET /videos/{id}` | Video detail with analysis status |
| Moderation | `GET /moderation/queue` | Paginated moderation queue |
| Moderation | `POST /moderation/queue/{id}/review` | Submit human review decision |
| Policies | `GET/POST /policies` | List or create moderation policies |
| Policies | `PUT/DELETE /policies/{id}` | Update or delete a policy |
| Live | `GET/POST /live/streams` | List or register live streams |
| Analytics | `GET /analytics/summary` | Throughput and violation summary |
| Webhooks | `POST /webhooks` | Register outbound webhook endpoint |

Full API specification: [`docs/API_SPEC.md`](docs/API_SPEC.md)

---

## CI / CD Pipeline

```
Push to feature/* branch
        |
        v
  GitHub Actions CI
  - Lint (ruff, eslint)
  - Unit + integration tests (pytest, jest)
  - Docker build validation
  - Terraform validate + fmt check
        |
        v
  Merge to development
        |
        v
  CD Staging
  - Build and push Docker images to ECR
  - Deploy to ECS staging environment
  - Run smoke tests
        |
        v
  Merge to main (via PR + approval)
        |
        v
  CD Production
  - Build and push production images
  - Blue/green deploy to ECS production
  - CloudWatch health check gates
```

---

## Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code. Protected. Requires PR and approval. |
| `development` | Active development integration branch. |
| `feature/*` | Feature branches. Branch from and PR back to `development`. |
| `fix/*` | Bug fix branches. |
| `chore/*` | Non-functional changes (deps, config, docs). |

Commit convention: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`

---

## Security

- All secrets managed via AWS Secrets Manager in production; `.env` files for local development (gitignored).
- JWT authentication with short-lived access tokens and refresh token rotation.
- Input validation and sanitization on all API boundaries.
- Rate limiting on authentication and sensitive endpoints.
- CORS restricted to configured origins.
- Prompt injection resistance: AI tool inputs are validated before execution.
- Audit logs for all moderation decisions and admin actions.

---

## Monitoring and Observability

| Tool | Purpose |
|------|---------|
| CloudWatch | Infrastructure metrics, ECS task health, alarm thresholds |
| Prometheus + Grafana | Application-level metrics: request rate, latency, queue depth |
| Sentry | Error tracking and alerting for both backend and frontend |
| Structured logging | `structlog` with JSON output; request ID propagation across services |

---

## Roadmap

- [ ] Mobile SDK for iOS and Android (read-only dashboard + alert push notifications)
- [ ] Batch moderation API for high-volume offline processing
- [ ] Custom fine-tuned classifiers per tenant use case
- [ ] CSAM hash-matching integration (PhotoDNA or equivalent)
- [ ] Video similarity deduplication using Pinecone vector search
- [ ] Self-serve tenant onboarding and billing portal

---

## Contributing

1. Fork the repository and create your branch from `development`.
2. Follow the branching and commit conventions described above.
3. Ensure all tests pass and linting is clean before opening a PR.
4. Open a pull request targeting `development` with a clear description of changes.
5. PRs require at least one approval before merging.

See [`git-branching-guide.md`](git-branching-guide.md) for detailed workflow documentation.

---

## License

This project is licensed under the MIT License. See [`LICENSE`](LICENSE) for details.

---

## Acknowledgements

Built with [FastAPI](https://fastapi.tiangolo.com/), [LangGraph](https://langchain-ai.github.io/langgraph/), [Next.js](https://nextjs.org/), and [OpenAI](https://openai.com/).
