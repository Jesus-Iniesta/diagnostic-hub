from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from app.api.deps import DbSession
from app.core.security import require_permission
from app.models.user import User
from app.services.alumnos_admin_service import (
    casos_por_revisar,
    generar_excel_por_revisar,
)
from app.services.carga_periodo_service import marcar_creani_descargado
from app.services.reportes_service import (
    generar_excel_reporte,
    get_periodos_disponibles,
    get_stats_reporte,
)

router = APIRouter()


@router.get(
    "/excel",
    summary="Descargar reporte Excel consolidado",
)
async def download_excel(
    db: DbSession,
    periodo: str = Query(..., description="Periodo a reportar"),
    licenciatura: str | None = Query(
        None, description="Clave de licenciatura para filtrar el reporte"
    ),
    _current_user: User = Depends(require_permission("consultar_estadisticas")),
):
    content = await generar_excel_reporte(db, periodo, licenciatura)
    if not licenciatura:
        # Último paso del periodo en Inicio ("Descarga el CREANI").
        await marcar_creani_descargado(db, periodo)
    suffix = f"_{licenciatura}" if licenciatura else ""
    filename = f"reporte{ suffix}_{periodo}.xlsx"
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/periodos",
    summary="Periodos disponibles para reportes",
)
async def list_periodos(
    db: DbSession,
    _current_user: User = Depends(require_permission("consultar_estadisticas")),
):
    periodos = await get_periodos_disponibles(db)
    return {"periodos": periodos}


@router.get(
    "/stats",
    summary="Estadísticas del reporte por periodo",
)
async def stats(
    db: DbSession,
    periodo: str = Query(...),
    _current_user: User = Depends(require_permission("consultar_estadisticas")),
):
    return await get_stats_reporte(db, periodo)


@router.get(
    "/alumnos-por-revisar",
    summary="Excel de alumnos por revisar (duplicados, sin cuenta, sin ingeniería, no registrados)",
)
async def alumnos_por_revisar(
    db: DbSession,
    periodo: str = Query(..., description="Periodo a revisar"),
    _current_user: User = Depends(require_permission("administrar_sistema")),
):
    casos = await casos_por_revisar(db, periodo)
    if not any(casos.values()):
        raise HTTPException(
            status_code=404,
            detail=f"No hay alumnos por revisar en el periodo {periodo.strip()}.",
        )
    filename = f"alumnos_por_revisar_{periodo.strip()}.xlsx"
    return Response(
        content=generar_excel_por_revisar(casos),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
