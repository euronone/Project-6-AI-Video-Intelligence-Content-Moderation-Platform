# AWS Deployment Guide — VidShield AI

Complete step-by-step implementation guide for deploying the Infrastructure & DevOps setup.

---

## Required Credentials, API Keys & Secrets

Gather **all of the following before starting**. Nothing can be provisioned without these.

---

### AWS Credentials

| Item | Where to Get It | Used For |
|------|----------------|----------|
| AWS Access Key ID | AWS Console → IAM → Users → Security Credentials | AWS CLI authentication |
| AWS Secret Access Key | Same as above (shown once at creation) | AWS CLI authentication |
| AWS Account ID | AWS Console → top-right account menu (12-digit number) | S3 bucket naming, ECR URIs, IAM ARNs |
| AWS Region | Your choice (recommend `us-east-1`) | All resource provisioning |

> Never commit AWS credentials to git. Store them in `~/.aws/credentials` (set by `aws configure`) or as environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).

---

### Third-Party API Keys

| Key | Where to Get It | Used For |
|-----|----------------|----------|
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) → API Keys | GPT-4o vision, Whisper transcription |
| `PINECONE_API_KEY` | [app.pinecone.io](https://app.pinecone.io) → API Keys | Vector similarity search |
| `SENTRY_DSN` | [sentry.io](https://sentry.io) → Project → Settings → Client Keys | Error tracking (optional but recommended) |

---

### Database Credentials

| Item | Value / Notes |
|------|--------------|
| RDS Master Username | `vidshield` (hardcoded in Terraform) |
| RDS Master Password | **You choose** — must be strong (min 16 chars, no `@`, `/`, `"`) |
| RDS Database Name | `vidshield` (hardcoded in Terraform) |
| RDS Port | `5432` (PostgreSQL default) |
| RDS Endpoint | Available **after** `terraform apply` (e.g. `vidshield-dev-postgres.xxxx.us-east-1.rds.amazonaws.com`) |

> The full `DATABASE_URL` format: `postgresql+asyncpg://vidshield:<password>@<rds-endpoint>:5432/vidshield`

---

### Redis / ElastiCache Details

| Item | Value / Notes |
|------|--------------|
| Redis Port | `6379` |
| Redis Endpoint | Available **after** `terraform apply` |
| TLS | Enabled in staging/prod (`rediss://`), optional in dev |

> The full `REDIS_URL` format: `rediss://<redis-endpoint>:6379/0`
> Celery broker uses DB index 1: `rediss://<redis-endpoint>:6379/1`
> Celery result backend uses DB index 2: `rediss://<redis-endpoint>:6379/2`

---

### Application Secrets

| Item | Value / Notes |
|------|--------------|
| `SECRET_KEY` | Random 64-char hex string — generate with `openssl rand -hex 32` |
| `JWT_ALGORITHM` | `HS256` (default, no change needed) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` (default) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` (default) |

---

### AWS S3 Details (Auto-Provisioned by Terraform)

These are created by Terraform — you do not need to create them manually. Note them after `terraform apply`.

| Bucket | Purpose |
|--------|---------|
| `vidshield-<env>-videos-<account-id>` | Raw video uploads |
| `vidshield-<env>-thumbnails-<account-id>` | Video thumbnails served via CloudFront |
| `vidshield-<env>-artifacts-<account-id>` | AI analysis artifacts (frames, transcripts) |

---

### GitHub Actions Secrets (CI/CD)

Required in GitHub repo → **Settings → Secrets and Variables → Actions**:

| Secret Name | Value |
|-------------|-------|
| `AWS_ROLE_ARN_STAGING` | IAM role ARN for staging OIDC (created in Phase 5) |
| `AWS_ROLE_ARN_PROD` | IAM role ARN for prod OIDC (created in Phase 5) |
| `ECR_REGISTRY` | `<account-id>.dkr.ecr.us-east-1.amazonaws.com` |
| `AWS_ACCOUNT_ID` | 12-digit AWS account number |
| `TF_STATE_BUCKET_STAGING` | `vidshield-tf-state-<account-id>` |
| `TF_STATE_BUCKET_PROD` | `vidshield-tf-state-<account-id>` |
| `TF_LOCK_TABLE` | `vidshield-tf-locks` |
| `DB_SECRET_ARN_STAGING` | Secrets Manager ARN for staging `DATABASE_URL` |
| `DB_SECRET_ARN_PROD` | Secrets Manager ARN for prod `DATABASE_URL` |
| `REDIS_SECRET_ARN_STAGING` | Secrets Manager ARN for staging `REDIS_URL` |
| `REDIS_SECRET_ARN_PROD` | Secrets Manager ARN for prod `REDIS_URL` |
| `SECRET_KEY_ARN_STAGING` | Secrets Manager ARN for staging `SECRET_KEY` |
| `SECRET_KEY_ARN_PROD` | Secrets Manager ARN for prod `SECRET_KEY` |
| `OPENAI_API_KEY_ARN` | Secrets Manager ARN for `OPENAI_API_KEY` |
| `PINECONE_API_KEY_ARN` | Secrets Manager ARN for `PINECONE_API_KEY` |
| `DB_PASSWORD_SECRET_ARN_STAGING` | Secrets Manager ARN for staging RDS password |
| `DB_PASSWORD_SECRET_ARN_PROD` | Secrets Manager ARN for prod RDS password |
| `ACM_CERT_ARN_PROD` | ACM certificate ARN for prod HTTPS (us-east-1) |
| `CLOUDFRONT_DISTRIBUTION_ID_PROD` | CloudFront distribution ID (from `terraform output`) |

---

### ACM Certificate (Production HTTPS Only)

For production with a custom domain, you need an SSL certificate in **us-east-1**:

```bash
# Request a certificate (domain validation)
aws acm request-certificate \
  --domain-name app.vidshield.ai \
  --subject-alternative-names "*.vidshield.ai" \
  --validation-method DNS \
  --region us-east-1

# Note the ARN — add to prod.tfvars as certificate_arn
# Complete DNS validation by adding the CNAME record shown in ACM console
```

---

### Secrets Checklist

Use this before running `terraform apply`:

```
AWS
[ ] AWS CLI configured (aws configure)
[ ] AWS Account ID noted
[ ] ECR repositories created

Terraform State
[ ] S3 state bucket created
[ ] DynamoDB lock table created
[ ] backend block uncommented in terraform/main.tf

Secrets Manager (create before terraform apply)
[ ] vidshield/<env>/db-password
[ ] vidshield/<env>/secret-key
[ ] vidshield/<env>/openai-api-key
[ ] vidshield/<env>/pinecone-api-key

Secrets Manager (create after terraform apply — needs endpoints)
[ ] vidshield/<env>/database-url
[ ] vidshield/<env>/redis-url

ARNs added to .tfvars
[ ] db_password_secret_arn
[ ] secret_key_arn
[ ] openai_api_key_arn
[ ] pinecone_api_key_arn
[ ] db_secret_arn       (after RDS endpoint known)
[ ] redis_secret_arn    (after Redis endpoint known)

GitHub Actions
[ ] All secrets added to repo
[ ] staging and production environments created
[ ] OIDC IAM role created
```

---

## Pre-requisites

Before anything, you need:

```bash
# Required tools
aws --version          # AWS CLI v2
terraform --version    # >= 1.6.0
docker --version       # Docker Desktop
git --version
```

Install if missing:
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
- [Terraform](https://developer.hashicorp.com/terraform/install)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)

---

## Phase 1 — AWS Account Setup (One-Time)

### 1.1 Configure AWS CLI

```bash
aws configure
# AWS Access Key ID: <your-key>
# AWS Secret Access Key: <your-secret>
# Default region: us-east-1
# Default output format: json
```

### 1.2 Create ECR Repositories

```bash
# Create ECR repos for backend and frontend images
aws ecr create-repository --repository-name vidshield-backend --region us-east-1
aws ecr create-repository --repository-name vidshield-frontend --region us-east-1

# Note the registry URI from the output:
# 123456789012.dkr.ecr.us-east-1.amazonaws.com
```

### 1.3 Create Terraform Remote State Resources

```bash
# Replace <account-id> with your actual AWS account ID
aws s3api create-bucket \
  --bucket vidshield-tf-state-<account-id> \
  --region us-east-1

# Enable versioning on state bucket
aws s3api put-bucket-versioning \
  --bucket vidshield-tf-state-<account-id> \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket vidshield-tf-state-<account-id> \
  --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Create DynamoDB lock table
aws dynamodb create-table \
  --table-name vidshield-tf-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 1.4 Store All Secrets in AWS Secrets Manager

```bash
# DB master password
aws secretsmanager create-secret \
  --name vidshield/dev/db-password \
  --secret-string "your-strong-db-password"

# App secret key (generate a strong random key)
aws secretsmanager create-secret \
  --name vidshield/dev/secret-key \
  --secret-string "$(openssl rand -hex 32)"

# OpenAI API key
aws secretsmanager create-secret \
  --name vidshield/dev/openai-api-key \
  --secret-string "sk-..."

# Pinecone API key
aws secretsmanager create-secret \
  --name vidshield/dev/pinecone-api-key \
  --secret-string "your-pinecone-key"

# DATABASE_URL (used by the app at runtime — after RDS is provisioned)
# Come back to this after Step 2.3 gives you the RDS endpoint
aws secretsmanager create-secret \
  --name vidshield/dev/database-url \
  --secret-string "postgresql+asyncpg://vidshield:<password>@<rds-endpoint>:5432/vidshield"

# REDIS_URL (after ElastiCache is provisioned)
aws secretsmanager create-secret \
  --name vidshield/dev/redis-url \
  --secret-string "rediss://<redis-endpoint>:6379/0"
```

> Note the ARN of each secret — you will need them for Terraform in Phase 2.

---

## Phase 2 — Terraform: Provision Infrastructure

### 2.1 Enable the S3 Backend

Open `terraform/main.tf` and uncomment the backend block:

```hcl
backend "s3" {
  bucket         = "vidshield-tf-state-<account-id>"
  key            = "envs/dev/terraform.tfstate"
  region         = "us-east-1"
  encrypt        = true
  dynamodb_table = "vidshield-tf-locks"
}
```

### 2.2 Fill in Secret ARNs in dev.tfvars

Open `terraform/environments/dev.tfvars` and uncomment + fill the secret ARN lines:

```hcl
db_password_secret_arn  = "arn:aws:secretsmanager:us-east-1:<account>:secret:vidshield/dev/db-password-xxxx"
secret_key_arn          = "arn:aws:secretsmanager:us-east-1:<account>:secret:vidshield/dev/secret-key-xxxx"
openai_api_key_arn      = "arn:aws:secretsmanager:us-east-1:<account>:secret:vidshield/dev/openai-api-key-xxxx"
pinecone_api_key_arn    = "arn:aws:secretsmanager:us-east-1:<account>:secret:vidshield/dev/pinecone-api-key-xxxx"
ecr_backend_image       = "123456789012.dkr.ecr.us-east-1.amazonaws.com/vidshield-backend:latest"
ecr_frontend_image      = "123456789012.dkr.ecr.us-east-1.amazonaws.com/vidshield-frontend:latest"
aws_account_id          = "123456789012"
```

### 2.3 Initialize and Apply Terraform

```bash
cd terraform

# Initialize — downloads providers, connects to S3 backend
terraform init

# Preview what will be created (~50 resources)
terraform plan -var-file=environments/dev.tfvars

# Apply — takes ~10-15 minutes on first run
terraform apply -var-file=environments/dev.tfvars
```

After apply completes, note the outputs:

```bash
terraform output                        # shows all outputs
terraform output rds_endpoint           # use this to create the database-url secret
terraform output redis_primary_endpoint # use this to create the redis-url secret
```

### 2.4 Create the Remaining Secrets (Now That RDS/Redis Endpoints Are Known)

```bash
# Create the runtime connection secrets using endpoints from terraform output
aws secretsmanager create-secret \
  --name vidshield/dev/database-url \
  --secret-string "postgresql+asyncpg://vidshield:<password>@<rds-endpoint>:5432/vidshield"

aws secretsmanager create-secret \
  --name vidshield/dev/redis-url \
  --secret-string "rediss://<redis-endpoint>:6379/0"

# Add their ARNs to dev.tfvars and re-apply
terraform apply -var-file=environments/dev.tfvars
```

---

## Phase 3 — Docker: Build and Push Images to ECR

### 3.1 Build Images Locally First (Validate)

```bash
# From project root
make build
# or
docker compose build
```

### 3.2 Push to ECR

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Tag and push backend
docker tag vidshield-backend:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/vidshield-backend:latest

docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/vidshield-backend:latest

# Tag and push frontend
docker tag vidshield-frontend:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/vidshield-frontend:latest

docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/vidshield-frontend:latest
```

Or use the Makefile:

```bash
make push
```

---

## Phase 4 — ECS: Deploy Services

After images are in ECR and Terraform has provisioned ECS services:

```bash
# Force ECS to pull the new images and restart
aws ecs update-service \
  --cluster vidshield-dev-cluster \
  --service vidshield-dev-api \
  --force-new-deployment \
  --region us-east-1

aws ecs update-service \
  --cluster vidshield-dev-cluster \
  --service vidshield-dev-worker \
  --force-new-deployment \
  --region us-east-1

aws ecs update-service \
  --cluster vidshield-dev-cluster \
  --service vidshield-dev-frontend \
  --force-new-deployment \
  --region us-east-1

# Wait for services to stabilise
aws ecs wait services-stable \
  --cluster vidshield-dev-cluster \
  --services vidshield-dev-api vidshield-dev-worker vidshield-dev-frontend

# Verify health
curl http://<alb-dns-name>/api/v1/health
```

---

## Phase 5 — GitHub Actions: CI/CD Setup

### 5.1 Create a GitHub OIDC IAM Role

```bash
# Create the OIDC provider for GitHub Actions (one-time per AWS account)
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
  --client-id-list sts.amazonaws.com

# Create the IAM role that GitHub Actions will assume
# (attach policies: ECS full access, ECR push, Terraform S3/DynamoDB)
```

### 5.2 Add GitHub Secrets

Go to your repo → **Settings → Secrets and Variables → Actions** and add:

| Secret | Value |
|--------|-------|
| `AWS_ROLE_ARN_STAGING` | IAM role ARN for staging deploys |
| `AWS_ROLE_ARN_PROD` | IAM role ARN for prod deploys |
| `ECR_REGISTRY` | `123456789012.dkr.ecr.us-east-1.amazonaws.com` |
| `AWS_ACCOUNT_ID` | `123456789012` |
| `TF_STATE_BUCKET_STAGING` | `vidshield-tf-state-<account-id>` |
| `TF_STATE_BUCKET_PROD` | same bucket, different key |
| `TF_LOCK_TABLE` | `vidshield-tf-locks` |
| `DB_SECRET_ARN_STAGING` | ARN of staging DB secret |
| `REDIS_SECRET_ARN_STAGING` | ARN of staging Redis secret |
| `SECRET_KEY_ARN_STAGING` | ARN of staging secret key |
| `OPENAI_API_KEY_ARN` | ARN of OpenAI secret |
| `PINECONE_API_KEY_ARN` | ARN of Pinecone secret |
| `DB_PASSWORD_SECRET_ARN_STAGING` | ARN of staging DB password |
| `DB_SECRET_ARN_PROD` | ARN of prod DB secret |
| `REDIS_SECRET_ARN_PROD` | ARN of prod Redis secret |
| `SECRET_KEY_ARN_PROD` | ARN of prod secret key |
| `DB_PASSWORD_SECRET_ARN_PROD` | ARN of prod DB password |
| `ACM_CERT_ARN_PROD` | ACM certificate ARN for prod HTTPS |
| `CLOUDFRONT_DISTRIBUTION_ID_PROD` | CloudFront distribution ID for prod |

### 5.3 Create GitHub Environments

Go to **Settings → Environments** and create:
- `staging` — no protection rules
- `production` — add **Required reviewers** (yourself or your team)

### 5.4 Trigger the Pipelines

```bash
# CI runs automatically on every push/PR

# CD staging — push to main branch
git push origin main

# CD prod — push a semver tag
git tag v1.0.0
git push origin v1.0.0
```

---

## Phase 6 — Local Development (No AWS Needed)

For day-to-day development, use Docker Compose — no AWS account required:

```bash
# Start everything locally (postgres, redis, backend, worker, frontend)
make dev
# or
docker compose up --build

# Services available at:
# Frontend:  http://localhost:3000
# Backend:   http://localhost:8000
# API docs:  http://localhost:8000/docs
# PG:        localhost:5432
# Redis:     localhost:6380
```

---

## Deployment Order Summary

```
1. AWS account setup (ECR, S3 state bucket, DynamoDB lock, Secrets Manager)
         ↓
2. terraform init → plan → apply
   (provisions VPC, RDS, Redis, ECS, ALB, S3, SQS, CloudFront, Monitoring)
         ↓
3. docker build → push to ECR
         ↓
4. aws ecs update-service  (or automatic via GitHub Actions CD)
         ↓
5. Verify: curl ALB /api/v1/health
```

For staging and production, steps 3–5 are **fully automated** by `.github/workflows/cd-staging.yml` and `.github/workflows/cd-prod.yml` — you just push code or tag a release.

---

## Terraform Per-Environment Cheatsheet

```bash
# Dev
cd terraform
terraform init
terraform plan  -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars

# Staging
terraform plan  -var-file=environments/staging.tfvars
terraform apply -var-file=environments/staging.tfvars

# Prod
terraform plan  -var-file=environments/prod.tfvars
terraform apply -var-file=environments/prod.tfvars

# Destroy dev (caution)
terraform destroy -var-file=environments/dev.tfvars
```

Or via the Makefile:

```bash
make tf-plan  ENV=dev
make tf-apply ENV=dev
make tf-plan  ENV=staging
make tf-apply ENV=staging
```

---

## References

- `terraform/` — All Terraform modules and environment configs
- `terraform/modules/vpc/` — VPC, subnets, NAT, security groups
- `terraform/modules/ecs/` — ECS cluster, ALB, task definitions, IAM roles
- `terraform/modules/rds/` — PostgreSQL 16
- `terraform/modules/elasticache/` — Redis 7
- `terraform/modules/s3/` — S3 buckets (videos, thumbnails, artifacts)
- `terraform/modules/cloudfront/` — CDN distribution
- `terraform/modules/sqs/` — Video processing and moderation queues
- `terraform/modules/monitoring/` — CloudWatch alarms and dashboard
- `.github/workflows/ci.yml` — Lint, test, build on every PR
- `.github/workflows/cd-staging.yml` — Auto-deploy to staging on merge to main
- `.github/workflows/cd-prod.yml` — Deploy to prod on semver tag with approval gate
- `docs/DEPLOYMENT.md` — Architecture-level deployment overview
