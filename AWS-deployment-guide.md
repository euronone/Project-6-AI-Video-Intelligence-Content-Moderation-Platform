# AWS Deployment Guide — VidShield AI

Complete step-by-step implementation guide for deploying the Infrastructure & DevOps setup on AWS. This guide covers everything to gather, prerequisites, infrastructure provisioning, Docker builds, ECS deployment, CI/CD setup, and post-deploy verification.

---

## Part 1: What to Gather Before Starting

Nothing can be provisioned without these. Gather **all** before Phase 1.

### 1.1 AWS Credentials

| Item | Where to Get | Used For |
|------|--------------|----------|
| AWS Access Key ID | IAM → Users → Security Credentials → Create access key | `aws configure` |
| AWS Secret Access Key | Same (shown once) | `aws configure` |
| AWS Account ID | Top-right account menu (12 digits) | S3 naming, ECR URIs, Terraform |
| AWS Region | Your choice (recommend `us-east-1`) | All resources |

**Security:** Never commit credentials. Use `~/.aws/credentials` or env vars.

### 1.2 Third-Party API Keys

| Key | Source | Purpose |
|-----|--------|---------|
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) → API Keys | GPT-4o vision, Whisper |
| `PINECONE_API_KEY` | [app.pinecone.io](https://app.pinecone.io) | Vector similarity search |
| `SENTRY_DSN` | [sentry.io](https://sentry.io) (optional) | Error tracking |

### 1.3 Database Credentials (you choose)

| Item | Value |
|------|-------|
| RDS username | `vidshield` (hardcoded in Terraform) |
| RDS password | Strong, 16+ chars, no `@`, `/`, `"` |
| RDS database | `vidshield` |
| RDS port | `5432` |

`DATABASE_URL` format:  
`postgresql+asyncpg://vidshield:<password>@<rds-endpoint>:5432/vidshield`

### 1.4 Application Secrets

- **SECRET_KEY:** `openssl rand -hex 32`

### 1.5 Redis URLs (created after Terraform)

| Use | Format |
|-----|--------|
| App/cache | `rediss://<redis-endpoint>:6379/0` |
| Celery broker | `rediss://<redis-endpoint>:6379/1` |
| Celery result | `rediss://<redis-endpoint>:6379/2` |

### 1.6 AWS S3 Buckets (Auto-Provisioned by Terraform)

Note these after `terraform apply` — you do not create them manually:

| Bucket | Purpose |
|--------|---------|
| `vidshield-<env>-videos-<account-id>` | Raw video uploads |
| `vidshield-<env>-thumbnails-<account-id>` | Video thumbnails served via CloudFront |
| `vidshield-<env>-artifacts-<account-id>` | AI analysis artifacts (frames, transcripts) |

### 1.7 Production-Only (for prod environment)

- **ACM Certificate ARN** — Request in us-east-1 for your domain (e.g. `app.vidshield.ai`, `*.vidshield.ai`).
- **Custom domain** — DNS records for CloudFront / ALB.

### 1.8 Secrets Checklist

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

## Part 2: Prerequisites

Install and verify:

```bash
aws --version          # AWS CLI v2
terraform --version    # >= 1.6.0
docker --version
git --version
```

Install if missing:

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
- [Terraform](https://developer.hashicorp.com/terraform/install)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)

---

## Part 3: Implementation Phases

### Phase 1 — AWS Account Setup (One-Time)

**1.1 Configure AWS CLI**

```bash
aws configure
# Enter Access Key ID, Secret, region us-east-1, output json
```

**1.2 Create ECR Repositories**

```bash
aws ecr create-repository --repository-name vidshield-backend --region us-east-1
aws ecr create-repository --repository-name vidshield-frontend --region us-east-1
# Note registry URI: <account-id>.dkr.ecr.us-east-1.amazonaws.com
```

**1.3 Create Terraform Remote State Resources**

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

aws s3api create-bucket --bucket vidshield-tf-state-${ACCOUNT_ID} --region us-east-1
aws s3api put-bucket-versioning --bucket vidshield-tf-state-${ACCOUNT_ID} \
  --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption --bucket vidshield-tf-state-${ACCOUNT_ID} \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

aws dynamodb create-table --table-name vidshield-tf-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST --region us-east-1
```

**1.4 Create Secrets in AWS Secrets Manager**

Create these **before** Terraform (RDS/Redis endpoints come after apply):

```bash
# DB password
aws secretsmanager create-secret --name vidshield/dev/db-password --secret-string "your-strong-password"

# App secret key
aws secretsmanager create-secret --name vidshield/dev/secret-key --secret-string "$(openssl rand -hex 32)"

# API keys
aws secretsmanager create-secret --name vidshield/dev/openai-api-key --secret-string "sk-..."
aws secretsmanager create-secret --name vidshield/dev/pinecone-api-key --secret-string "your-pinecone-key"
```

Note the ARN of each secret.  
`vidshield/dev/database-url` and `vidshield/dev/redis-url` are created **after** Terraform apply (Phase 2.5).

---

### Phase 2 — Terraform: Provision Infrastructure

**2.1 Enable S3 Backend**

In `terraform/main.tf`, uncomment the backend block and replace `<account-id>`:

```hcl
backend "s3" {
  bucket         = "vidshield-tf-state-<account-id>"
  key            = "envs/dev/terraform.tfstate"
  region         = "us-east-1"
  encrypt        = true
  dynamodb_table = "vidshield-tf-locks"
}
```

**2.2 Fill Secret ARNs in dev.tfvars**

In `terraform/environments/dev.tfvars`, uncomment and set:

```hcl
db_password_secret_arn  = "arn:aws:secretsmanager:us-east-1:<account>:secret:vidshield/dev/db-password-xxxx"
secret_key_arn          = "arn:aws:secretsmanager:us-east-1:<account>:secret:vidshield/dev/secret-key-xxxx"
openai_api_key_arn      = "arn:aws:secretsmanager:us-east-1:<account>:secret:vidshield/dev/openai-api-key-xxxx"
pinecone_api_key_arn    = "arn:aws:secretsmanager:us-east-1:<account>:secret:vidshield/dev/pinecone-api-key-xxxx"
ecr_backend_image       = "<account>.dkr.ecr.us-east-1.amazonaws.com/vidshield-backend:latest"
ecr_frontend_image      = "<account>.dkr.ecr.us-east-1.amazonaws.com/vidshield-frontend:latest"
aws_account_id          = "<account-id>"
```

**Note:** `db_secret_arn` and `redis_secret_arn` require RDS/Redis endpoints from the first apply. Use the two-pass approach below.

**2.3 Two-Pass Terraform (Secrets Dependency)**

Terraform needs `db_secret_arn` and `redis_secret_arn`, but those secrets need RDS/Redis endpoints. Options:

- **Option A:** Create placeholder secrets with dummy URLs so Terraform can run. Immediately after apply, create the real secrets and re-apply.
- **Option B:** Make `db_secret_arn`/`redis_secret_arn` optional in Terraform and wire after first apply.

Recommended: Use placeholder secrets (e.g. `postgresql+asyncpg://vidshield:placeholder@placeholder:5432/vidshield`) so Terraform can run. Create the real secrets after the first apply and re-apply.

**2.4 Initialize and Apply**

```bash
cd terraform
terraform init
terraform plan -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars
```

**2.5 Create Runtime Secrets (After Apply)**

```bash
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
REDIS_ENDPOINT=$(terraform output -raw redis_primary_endpoint)

aws secretsmanager create-secret --name vidshield/dev/database-url \
  --secret-string "postgresql+asyncpg://vidshield:<password>@${RDS_ENDPOINT}:5432/vidshield"

aws secretsmanager create-secret --name vidshield/dev/redis-url \
  --secret-string "rediss://${REDIS_ENDPOINT}:6379/0"
```

Add `db_secret_arn` and `redis_secret_arn` to dev.tfvars, then:

```bash
terraform apply -var-file=environments/dev.tfvars
```

---

### Phase 3 — Docker: Build and Push Images

**3.1 Validate Build Locally**

```bash
make build
# or: docker compose build
```

**3.2 Push to ECR**

```bash
ECR_REGISTRY="<account-id>.dkr.ecr.us-east-1.amazonaws.com"
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${ECR_REGISTRY}

docker tag vidshield-backend:latest ${ECR_REGISTRY}/vidshield-backend:latest
docker push ${ECR_REGISTRY}/vidshield-backend:latest

docker tag vidshield-frontend:latest ${ECR_REGISTRY}/vidshield-frontend:latest
docker push ${ECR_REGISTRY}/vidshield-frontend:latest
```

Or use the Makefile (after configuring `docker-compose.prod.yml` for ECR):

```bash
make push
```

Ensure `docker-compose` build produces images named `vidshield-backend` and `vidshield-frontend`, or adjust tags accordingly.

---

### Phase 4 — ECS: Deploy and Verify

**4.1 Force New Deployment**

```bash
aws ecs update-service --cluster vidshield-dev-cluster --service vidshield-dev-api --force-new-deployment --region us-east-1
aws ecs update-service --cluster vidshield-dev-cluster --service vidshield-dev-worker --force-new-deployment --region us-east-1
aws ecs update-service --cluster vidshield-dev-cluster --service vidshield-dev-frontend --force-new-deployment --region us-east-1
```

**4.2 Wait for Stability**

```bash
aws ecs wait services-stable --cluster vidshield-dev-cluster \
  --services vidshield-dev-api vidshield-dev-worker vidshield-dev-frontend --region us-east-1
```

**4.3 Verify Health**

```bash
ALB_DNS=$(aws elbv2 describe-load-balancers --names vidshield-dev-alb --query 'LoadBalancers[0].DNSName' --output text --region us-east-1)
curl http://${ALB_DNS}/api/v1/health
```

**4.4 Optional: Seed Admin User**

The ECS API task runs `alembic upgrade head` before uvicorn (`terraform/modules/ecs/main.tf`). Admin seed is **not** run in ECS. To create an initial admin:

- Run a one-off ECS task with `python scripts/seed_admin.py`, or
- Use `docker compose run` against RDS (with appropriate security/network access).

---

### Phase 5 — GitHub Actions CI/CD (Staging/Prod)

**5.1 Create GitHub OIDC Provider (One-Time)**

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
  --client-id-list sts.amazonaws.com
```

**5.2 Create IAM Role for GitHub Actions**

Create an IAM role that:

- Trusts `token.actions.githubusercontent.com` with conditions for your repo.
- Has policies: ECS, ECR push, S3 (Terraform state), DynamoDB (locks), Secrets Manager read.

**5.3 Add GitHub Secrets**

Repo → Settings → Secrets and Variables → Actions. Add:

| Secret Name | Value |
|-------------|-------|
| `AWS_ROLE_ARN_STAGING` | IAM role ARN for staging OIDC |
| `AWS_ROLE_ARN_PROD` | IAM role ARN for prod OIDC |
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

**5.4 Create GitHub Environments**

Settings → Environments → Create:

- `staging` — no protection rules
- `production` — add **Required reviewers** (yourself or your team)

**5.5 Trigger Deploys**

- **Staging:** Push to `main` (see `.github/workflows/cd-staging.yml`).
- **Prod:** Push a semver tag (e.g. `v1.0.0`) for `.github/workflows/cd-prod.yml`.

---

### Phase 6 — Local Development (No AWS Needed)

For day-to-day development, use Docker Compose:

```bash
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

## Part 4: Deployment Order Summary

```
1. AWS account setup (ECR, S3 state bucket, DynamoDB lock, Secrets Manager)
         ↓
2. terraform init → plan → apply (two-pass if needed for DB/Redis secrets)
   (provisions VPC, RDS, Redis, ECS, ALB, S3, SQS, CloudFront, Monitoring)
         ↓
3. docker build → push to ECR
         ↓
4. aws ecs update-service  (or automatic via GitHub Actions CD)
         ↓
5. Verify: curl <alb>/api/v1/health
```

For staging and production, steps 3–5 are **fully automated** by `.github/workflows/cd-staging.yml` and `.github/workflows/cd-prod.yml`.

---

## Part 5: Terraform Per-Environment Cheatsheet

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

## Part 6: Post-Deploy Checklist

- [ ] Health endpoint returns 200 (`/api/v1/health`)
- [ ] Frontend loads (ALB or CloudFront URL)
- [ ] Database migrations applied (Alembic runs on API container start)
- [ ] Admin user seeded (if required)
- [ ] CloudWatch logs for API/Worker/Frontend
- [ ] S3 buckets created (videos, thumbnails, artifacts)
- [ ] Pinecone index created and configured (env/index name)
- [ ] DNS and ACM certificate (prod only)

---

## Part 7: Pinecone Setup (Not in Terraform)

Pinecone is a managed SaaS. You must:

1. Create a Pinecone project and index at [app.pinecone.io](https://app.pinecone.io).
2. Configure `PINECONE_API_KEY` and any index/environment names in the application config.
3. Ensure the backend has the correct Pinecone env vars (from Secrets Manager).

---

## Part 8: ACM Certificate (Production HTTPS Only)

For production with a custom domain, request an SSL certificate in **us-east-1**:

```bash
aws acm request-certificate \
  --domain-name app.vidshield.ai \
  --subject-alternative-names "*.vidshield.ai" \
  --validation-method DNS \
  --region us-east-1

# Note the ARN — add to prod.tfvars as certificate_arn
# Complete DNS validation by adding the CNAME record shown in ACM console
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
