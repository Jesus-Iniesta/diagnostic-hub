from fastapi import APIRouter

from app.api.v1 import alumnos, auth, health

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(alumnos.router, prefix="/alumnos", tags=["alumnos"])