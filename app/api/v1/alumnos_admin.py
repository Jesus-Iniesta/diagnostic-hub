from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import DbSession
from app.core.security import require_permission
from app.models.user import User
from app.services.alumnos_admin_service import (
    FILTROS,
    DatosAlumnoError,
    actualizar_datos,
    listar_alumnos,
    obtener_alumno,
)
from app.services.unir_alumnos_service import UnionError, unir_alumnos

router = APIRouter()


class DatosAlumnoPayload(BaseModel):
    numero_cuenta: str | None = None
    numero_folio: str | None = None
    ingenieria_id: int | None = None


class UnirAlumnosPayload(BaseModel):
    conservar_id: int
    eliminar_id: int


@router.get("", summary="Lista de alumnos (administrador)")
async def get_alumnos(
    db: DbSession,
    busqueda: str | None = Query(default=None),
    periodo: str | None = Query(default=None),
    filtro: str = Query(default="todos", description="todos | por_revisar | provisionales | sin_cuenta"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _current_user: User = Depends(require_permission("administrar_sistema")),
):
    if filtro not in FILTROS:
        raise HTTPException(status_code=400, detail=f"Filtro no válido: {filtro}")
    return await listar_alumnos(
        db, busqueda=busqueda, periodo=periodo, filtro=filtro, limit=limit, offset=offset
    )


@router.patch("/{alumno_id}", summary="Editar cuenta, folio e ingeniería de un alumno")
async def patch_alumno(
    alumno_id: int,
    payload: DatosAlumnoPayload,
    db: DbSession,
    _current_user: User = Depends(require_permission("administrar_sistema")),
):
    try:
        return await actualizar_datos(
            db,
            alumno_id,
            numero_cuenta=payload.numero_cuenta,
            numero_folio=payload.numero_folio,
            ingenieria_id=payload.ingenieria_id,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except DatosAlumnoError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.post("/unir", summary="Unir dos alumnos que son la misma persona")
async def post_unir(
    payload: UnirAlumnosPayload,
    db: DbSession,
    _current_user: User = Depends(require_permission("administrar_sistema")),
):
    try:
        resultado = await unir_alumnos(db, payload.conservar_id, payload.eliminar_id)
    except UnionError as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))
    await db.commit()
    return {**resultado, "alumno": await obtener_alumno(db, payload.conservar_id)}
