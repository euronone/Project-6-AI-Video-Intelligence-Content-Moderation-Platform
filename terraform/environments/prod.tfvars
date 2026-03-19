# ── prod.tfvars ────────────────────────────────────────────────────────────────
# Full-scale production configuration.
# Multi-AZ RDS, two NAT gateways, deletion protection, sensitive alarms.
# terraform apply -var-file=environments/prod.tfvars

project     = "vidshield"
environment = "prod"
aws_region  = "us-east-1"
# aws_account_id = "<your-account-id>"   # set via TF_VAR_aws_account_id env var

availability_zones   = ["us-east-1a", "us-east-1b"]
vpc_cidr             = "10.2.0.0/16"
public_subnet_cidrs  = ["10.2.1.0/24", "10.2.2.0/24"]
private_subnet_cidrs = ["10.2.11.0/24", "10.2.12.0/24"]
single_nat_gateway   = false # one NAT GW per AZ for high availability

# ECS sizing — production scale
api_cpu              = 1024
api_memory           = 2048
api_desired_count    = 2
worker_cpu           = 2048
worker_memory        = 4096
worker_desired_count = 2
frontend_cpu         = 512
frontend_memory      = 1024
frontend_desired_count = 2

# RDS — production grade: Multi-AZ, deletion protection, 30-day backups
rds_instance_class        = "db.r8g.large"
rds_allocated_storage     = 50
rds_max_allocated_storage = 500
rds_multi_az              = true
rds_backup_retention_days = 30
rds_deletion_protection   = true
rds_skip_final_snapshot   = false

# ElastiCache — two replicas for HA
redis_node_type       = "cache.r7g.large"
redis_num_cache_nodes = 2

# S3 — never allow force destruction
s3_force_destroy = false

# CloudFront — global CDN, custom domain with ACM cert
cloudfront_price_class = "PriceClass_All"
# certificate_arn = "arn:aws:acm:us-east-1:<account>:certificate/<cert-id>"
# domain_aliases  = ["app.vidshield.ai", "www.vidshield.ai"]
cors_origins = "[\"https://app.vidshield.ai\"]"

# Monitoring — tight thresholds for production SLA
api_5xx_threshold = 5
# alarm_email = "oncall@vidshield.ai"

tags = {
  CostCenter  = "engineering"
  Team        = "platform"
  Criticality = "production"
}
