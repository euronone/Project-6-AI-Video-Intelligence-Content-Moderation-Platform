# ── dev.tfvars ─────────────────────────────────────────────────────────────────
# Cost-optimised single-AZ dev environment.
# terraform apply -var-file=environments/dev.tfvars

project     = "vidshield"
environment = "dev"
aws_region  = "us-east-1"
# aws_account_id = "<your-account-id>"   # set via TF_VAR_aws_account_id env var

availability_zones   = ["us-east-1a", "us-east-1b"]
vpc_cidr             = "10.0.0.0/16"
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24"]
single_nat_gateway   = true # one NAT GW to save cost in dev

# ECS sizing — minimum viable
api_cpu              = 256
api_memory           = 512
api_desired_count    = 1
worker_cpu           = 512
worker_memory        = 1024
worker_desired_count = 1
frontend_cpu         = 256
frontend_memory      = 512
frontend_desired_count = 1

# RDS — smallest instance, single-AZ, no deletion protection
rds_instance_class        = "db.t4g.micro"
rds_allocated_storage     = 10
rds_max_allocated_storage = 30
rds_multi_az              = false
rds_backup_retention_days = 1
rds_deletion_protection   = false
rds_skip_final_snapshot   = true

# ElastiCache — smallest node, single
redis_node_type       = "cache.t4g.micro"
redis_num_cache_nodes = 1

# S3 — allow bucket destruction for dev cleanup
s3_force_destroy = true

# CloudFront
cloudfront_price_class = "PriceClass_100"
certificate_arn        = "" # no HTTPS in dev; use HTTP via ALB
domain_aliases         = []
cors_origins           = "[\"*\"]"

# Monitoring
api_5xx_threshold = 50  # less sensitive in dev
alarm_email       = ""  # set to your email to receive dev alerts

# Secrets — set via TF_VAR_* environment variables or AWS Secrets Manager ARNs
# db_password_secret_arn  = "arn:aws:secretsmanager:us-east-1:<account>:secret:vidshield/dev/db-password-xxxx"
# db_secret_arn           = "arn:aws:secretsmanager:us-east-1:<account>:secret:vidshield/dev/database-url-xxxx"
# redis_secret_arn        = "arn:aws:secretsmanager:us-east-1:<account>:secret:vidshield/dev/redis-url-xxxx"
# secret_key_arn          = "arn:aws:secretsmanager:us-east-1:<account>:secret:vidshield/dev/secret-key-xxxx"
# openai_api_key_arn      = "arn:aws:secretsmanager:us-east-1:<account>:secret:vidshield/dev/openai-api-key-xxxx"
# pinecone_api_key_arn    = "arn:aws:secretsmanager:us-east-1:<account>:secret:vidshield/dev/pinecone-api-key-xxxx"

# ECR images — set via TF_VAR_* or CI/CD
# ecr_backend_image  = "<account>.dkr.ecr.us-east-1.amazonaws.com/vidshield-backend:latest"
# ecr_frontend_image = "<account>.dkr.ecr.us-east-1.amazonaws.com/vidshield-frontend:latest"

tags = {
  CostCenter = "engineering"
  Team       = "platform"
}
