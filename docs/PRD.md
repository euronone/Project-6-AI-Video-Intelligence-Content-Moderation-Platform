# Product Requirements Document — VidShield AI

## 1. Overview

**VidShield AI** is an enterprise-grade AI Video Intelligence & Content Moderation Platform that analyzes live and recorded videos for content safety, metadata extraction, object/scene recognition, and actionable insights. The system is designed for **fully autonomous operation** — zero human intervention from ingestion to moderation decisions to deployment, with optional human review configurable per policy.

**Target segments:** YouTube-like platforms, edtech, social media, surveillance.

## 2. Goals

- Automate content safety and moderation for video at scale.
- Provide policy-driven, auditable moderation decisions and reports.
- Support both recorded (upload) and live stream ingestion.
- Expose a clear API and webhooks for platform and partner integration.
- Enable operators to configure policies, monitor queue, and view analytics via a web dashboard.

## 3. Features

### 3.1 Video ingestion

- **Upload:** Support video upload (e.g. presigned S3 URL or direct upload); async processing after upload.
- **Live stream:** Ingest live streams for real-time or near-real-time analysis; status and alerts via API/WebSocket.
- **API submission:** REST API for platforms to submit video references or URLs; async processing via queue.

### 3.2 Video analysis pipeline

- Frame extraction at configurable intervals (FFmpeg, OpenCV, PyAV).
- Audio transcription (OpenAI Whisper); store transcript linked to video.
- Thumbnail and artifact generation; store in S3.
- LangGraph-orchestrated multi-agent pipeline: Orchestrator, Content Analyzer, Safety Checker, Metadata Extractor, Scene Classifier, Report Generator.
- Tools: frame extractor, audio transcriber, OCR, object detector, similarity search (Pinecone).

### 3.3 Content moderation

- Policy-driven moderation: configurable rules and categories (e.g. violence, nudity, drugs, hate symbols).
- Autonomous decisions with optional escalation to human review per policy.
- Moderation queue: list of items pending or requiring human review; filters and priority.
- Structured moderation report per video/stream (violations, timestamps, confidence, recommended action).

### 3.4 Policies and automation

- Policy CRUD: create, update, delete moderation policies; link to categories and actions.
- Auto-actions: auto-flag, auto-reject, or escalate based on policy and AI output.
- Configurable escalation and human-review workflow; audit trail.

### 3.5 Live streams

- Live stream registration and ingestion.
- Real-time or near-real-time analysis and alerts.
- Dashboard: live feed, stream monitor, alert banners; WebSocket for status updates.

### 3.6 Analytics and reporting

- Throughput, violation rates, policy effectiveness, processing latency.
- Dashboards: charts, heatmaps, stat cards (per CLAUDE.md frontend structure).
- Export or API access for reporting where required.

### 3.7 Alerts and notifications

- Alerts for policy violations, queue backlog, pipeline failures.
- Notifications via email, webhook, or in-app; configurable per tenant/environment.

### 3.8 Integrations and API

- REST API (`/api/v1/`) for videos, moderation, policies, live, analytics, webhooks.
- Outbound webhooks: moderation result, violation, alert, stream status.
- API key or JWT authentication; rate limiting and audit logging.
- Optional WebSocket for live stream and moderation status.

### 3.9 Admin and operator experience

- Web dashboard: videos, moderation queue, policies, live streams, analytics, settings.
- RBAC: admin/operator roles; no admin flows in mobile/partner apps.
- API key management, system monitoring, tenant/org settings where applicable.

## 4. Non-goals (out of scope for this PRD)

- Building a generic customer support copilot (chat, tickets, omni-channel).
- Native mobile app development (optional; API supports future mobile clients).
- Twilio/WhatsApp/SMS or email as primary channel (email only for notifications/webhooks).

## 5. Security & compliance

- No hardcoded secrets; use env and secret managers (e.g. AWS Secrets Manager).
- Validate and sanitize inputs; rate limit sensitive endpoints.
- PII detection and masking where required (e.g. transcripts); audit logs for sensitive actions.
- GDPR-aware design (export, deletion, retention) where applicable.
- Secure API auth (API keys, JWT); prompt injection resistance and tool validation for AI.

## 6. Success metrics

- Processing latency (upload to report).
- Moderation accuracy and false positive/negative rates (tuned over time).
- Throughput (videos/streams processed per unit time).
- Uptime and pipeline reliability.
- Operator adoption (policies configured, queue usage, dashboard usage).

## 7. References

- **CLAUDE.md** — Tech stack, project structure, AI agent architecture, key commands.
- **docs/ARCHITECTURE.md** — System architecture and layers.
- **docs/API_SPEC.md** — API contracts and webhooks.
- **docs/DB_SCHEMA.md** — Data model.
- **docs/DEPLOYMENT.md** — Deployment and infrastructure.
