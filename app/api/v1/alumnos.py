from fastapi import APIRouter, Depends, Query

from app.api.deps import DbSession
from app.core.security import require_permission
from app.models.user import User
from app.repositories.alumno_repository import AlumnoRepository
from app.schemas.alumno import AlumnoListResponse, AlumnoRead

router = APIRouter()


@router.get(
    "",
    response_model=AlumnoListResponse,
    summary="Listar alumnos con filtros y paginación",
)
async def list_alumnos(
    db: DbSession,
    periodo_ingreso: str | None = Query(
        default=None, description="Periodo de ingreso (ej. 2025-1)"
    ),
    ingenieria_clave: str | None = Query(
        default=None, description="Clave de la ingeniería/licenciatura"
    ),
    numero_cuenta: str | None = Query(
        default=None, description="Número de cuenta o folio del alumno"
    ),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _current_user: User = Depends(require_permission("consultar_estadisticas")),
):
    repo = AlumnoRepository(db)
    items, total = await repo.list(
        periodo_ingreso=periodo_ingreso,
        ingenieria_clave=ingenieria_clave,
        numero_cuenta=numero_cuenta,
        limit=limit,
        offset=offset,
    )
    return AlumnoListResponse(
        items=[AlumnoRead.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )