from fastapi import APIRouter

from app.api.v1 import (
    alumnos,
    auth,
    configuracion,
    health,
    ingenierias,
    registro_alumno,
    upload_alumnos,
    users,
)

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(alumnos.router, prefix="/alumnos", tags=["alumnos"])
api_router.include_router(
    registro_alumno.router, prefix="/alumnos", tags=["alumnos"]
)
api_router.include_router(
    ingenierias.router, prefix="/ingenierias", tags=["ingenierias"]
)
api_router.include_router(
    configuracion.router, prefix="/configuracion", tags=["configuracion"]
)
api_router.include_router(
    upload_alumnos.router, prefix="/alumnos", tags=["alumnos"]
)
api_router.include_router(users.router, prefix="/users", tags=["users"])