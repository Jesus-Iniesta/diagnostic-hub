from fastapi import APIRouter, Depends, Query

from app.api.deps import DbSession
from app.core.security import require_permission
from app.models.user import User
from app.repositories.dashboard_repository import DashboardRepository

router = APIRouter()


@router.get(
    "/stats",
    summary="Estadísticas consolidadas del dashboard admin",
)
async def get_dashboard_stats(
    db: DbSession,
    periodo: str = Query(..., description="Periodo a consultar"),
    ingenieria: str | None = Query(
        None, description="Clave de ingeniería para filtrar distribución"
    ),
    _current_user: User = Depends(require_permission("consultar_estadisticas")),
):
    repo = DashboardRepository(db)
    return await repo.get_stats(periodo, ingenieria)
