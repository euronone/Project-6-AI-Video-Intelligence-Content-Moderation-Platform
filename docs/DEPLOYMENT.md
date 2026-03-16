# Deployment — VidShield AI

## 1. Overview

VidShield AI is deployed on **AWS** using **Docker** for packaging and **Terraform** (and optionally **AWS CDK**) for infrastructure. CI/CD is handled by **GitHub Actions**. No application code is executed in this doc; only configuration and topology are described.

## 2. Environments

- **dev** — Development; optional shared or local DB/Redis/S3; used for feature and integration testing.
- **staging** — Pre-production; mirrors production topology with smaller scale; for QA and release validation.
- **prod** — Production; full scale, backups, and monitoring.

Config per environment: Terraform vars (e.g. `environments/dev.tfvars`, `staging.tfvars`, `prod.tfvars`), env vars in ECS task definitions, and secrets in AWS Secrets Manager.

## 3. Infrastructure (AWS)

### 3.1 Compute

- **ECS Fargate** for running containers. Services: API (FastAPI), workers (Celery), and optionally frontend (Next.js) or frontend served via CloudFront + S3/Next export.
- **ALB** in front of API and (if applicable) frontend; HTTPS termination; health checks on `/api/v1/health` and equivalent.

### 3.2 Data and storage

- **RDS (PostgreSQL 16):** Primary database. Multi-AZ for prod; backups and retention per policy.
- **ElastiCache (Redis 7):** Cache and Celery broker. Cluster mode or single node per env size.
- **S3:** Video uploads, thumbnails, artifacts. Buckets per env or per tenant; lifecycle and CORS as needed. Presigned URLs for upload/download.
- **Pinecone:** Vector store; managed service; configure index and env via API key and env vars.

### 3.3 Messaging and async

- **Celery** with Redis as broker. Optional **SQS** for high-throughput or durable queues (e.g. video processing queue); document in ARCHITECTURE if used.
- **Lambda:** Optional for event-driven triggers (e.g. S3 upload → trigger processing); not required for initial deployment.

### 3.4 CDN and static

- **CloudFront** in front of ALB and/or static assets; optional for API caching (e.g. public read-only endpoints). Frontend can be Next.js on ECS or static export on S3 + CloudFront.

### 3.5 Networking

- **VPC:** Private subnets for ECS, RDS, ElastiCache; public subnets for ALB. NAT for outbound (OpenAI, S3, Pinecone).
- **Security groups:** Minimal ingress/egress; no direct exposure of RDS/Redis to internet.

## 4. Containers

- **Backend API:** Dockerfile in `backend/`; run Uvicorn; env from ECS task definition and Secrets Manager.
- **Workers:** Same or separate image; run Celery worker (and beat if needed); same env and secrets.
- **Frontend:** Dockerfile in `frontend/`; build Next.js; run `next start` or serve via Node server; API URL via env.

Images stored in **ECR**; tagged by git commit or version. Pull by ECS from same account.

## 5. Secrets and configuration

- **AWS Secrets Manager** (or Parameter Store) for: DB credentials, Redis URL, OpenAI API key, Whisper (if separate), S3 access, Pinecone API key, webhook secrets, JWT secret. Rotate per policy.
- **Environment variables:** Non-secret config (e.g. log level, feature flags, tenant defaults) in ECS task definitions or Terraform.
- No secrets in code or in Terraform repo as plain text; reference by secret name/ARN.

## 6. CI/CD

- **GitHub Actions:**
  - **CI:** On PR/push — lint (ruff, eslint), unit and integration tests, build Docker images. No deploy.
  - **CD (staging):** On merge to `main` or `staging` — build, push to ECR, run Terraform apply for staging, update ECS service.
  - **CD (prod):** On tag or manual approval — same for prod; optional manual gate.
- **Terraform:** Apply per env; state in S3 + DynamoDB lock. Modules (per CLAUDE.md): vpc, ecs, rds, elasticache, s3, cloudfront, sqs, monitoring.

## 7. Monitoring and observability

- **CloudWatch:** Logs from ECS tasks (structured JSON); metrics (CPU, memory, request count, latency). Alarms for API 5xx, queue depth, pipeline failures.
- **Prometheus / Grafana:** Optional; scrape metrics from API and workers if exposed; dashboards for throughput, latency, violation rates.
- **Sentry:** Error tracking; DSN in env; no PII in payloads.
- **Health checks:** ALB targets `/api/v1/health`; return 200 when app and critical dependencies (DB, Redis) are reachable.

## 8. Rollback and resilience

- **ECS:** Rolling updates; minimum healthy count and circuit breaker if configured. Rollback by redeploying previous task definition.
- **DB migrations:** Run Alembic as init container or separate job before new API deploy; backward-compatible migrations preferred.
- **Feature flags:** Optional; use env or config to toggle new behavior without redeploy.

## 9. References

- **CLAUDE.md** — Key commands (`make deploy ENV=staging`, Terraform, Docker).
- **docs/ARCHITECTURE.md** — Services and dependencies.
- **docs/API_SPEC.md** — Health and public endpoints.
- **.cursor/rules/90-devops-docker-aws.mdc** — DevOps and security rules.
