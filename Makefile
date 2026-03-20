.PHONY: dev dev-frontend dev-backend dev-worker \
        build push \
        test test-backend test-frontend lint \
        db-migrate db-revision \
        tf-plan tf-apply deploy \
        up down logs ps clean

# ── Local Development ─────────────────────────────────────────────────────────
dev:
	docker compose up --build

dev-d:
	docker compose up --build -d

dev-frontend:
	cd frontend && npm run dev

dev-backend:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-worker:
	cd backend && celery -A app.workers.celery_app worker --loglevel=info

# ── Docker Compose helpers ────────────────────────────────────────────────────
up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

ps:
	docker compose ps

clean:
	docker compose down -v --remove-orphans

# ── Testing ───────────────────────────────────────────────────────────────────
test: test-backend test-frontend

test-backend:
	cd backend && python -m pytest --tb=short -q

test-frontend:
	cd frontend && npm test -- --passWithNoTests

lint:
	cd backend && python -m ruff check . && python -m ruff format --check .
	cd frontend && npm run lint

# ── Database ──────────────────────────────────────────────────────────────────
db-migrate:
	cd backend && alembic upgrade head

db-revision:
	cd backend && alembic revision --autogenerate -m "$(MSG)"

# ── Docker Build ──────────────────────────────────────────────────────────────
build:
	docker compose build

push:
	docker compose push

# ── Infrastructure ────────────────────────────────────────────────────────────
tf-plan:
	cd terraform && terraform plan -var-file=environments/$(ENV).tfvars

tf-apply:
	cd terraform && terraform apply -var-file=environments/$(ENV).tfvars

deploy:
	@echo "Deploying to $(ENV)..."
	docker compose -f docker-compose.yml -f docker-compose.prod.yml build
	docker compose -f docker-compose.yml -f docker-compose.prod.yml push
