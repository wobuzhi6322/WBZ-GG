from __future__ import annotations

from fastapi import APIRouter

from .routes.health import router as health_router
from .routes.players import router as players_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(players_router)

