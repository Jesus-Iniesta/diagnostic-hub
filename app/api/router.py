from fastapi import APIRouter

from app.api.v1 import (
    alumnos,
    auth,
    configuracion,
    dashboard,
    diagnostico,
    health,
    ingenierias,
    liga_examen_diagnostico,
    registro_alumno,
    reportes,
    upload_alumnos,
    users,
    webassign,
)

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(
    dashboard.router, prefix="/dashboard", tags=["dashboard"]
)
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
api_router.include_router(
    liga_examen_diagnostico.router,
    prefix="/ligas-examenes",
    tags=["ligas-examenes"],
)
api_router.include_router(
    diagnostico.router,
    prefix="/diagnostico",
    tags=["diagnostico"],
)
api_router.include_router(
    webassign.router,
    prefix="/webassign",
    tags=["webassign"],
)
api_router.include_router(
    reportes.router,
    prefix="/reportes",
    tags=["reportes"],
)