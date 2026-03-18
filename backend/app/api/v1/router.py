from fastapi import APIRouter

from app.api.v1 import analytics, auth, live, moderation, policies, videos, webhooks

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(videos.router)
api_router.include_router(moderation.router)
api_router.include_router(analytics.router)
api_router.include_router(live.router)
api_router.include_router(policies.router)
api_router.include_router(webhooks.router)
