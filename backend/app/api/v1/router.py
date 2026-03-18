from fastapi import APIRouter

from app.api.v1 import auth

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)

# Future routers are included here as each feature branch merges:
# from app.api.v1 import videos, moderation, analytics, live, policies, webhooks
# api_router.include_router(videos.router)
# api_router.include_router(moderation.router)
# api_router.include_router(analytics.router)
# api_router.include_router(live.router)
# api_router.include_router(policies.router)
# api_router.include_router(webhooks.router)
