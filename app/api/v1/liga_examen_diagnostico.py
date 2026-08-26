from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import DbSession
from app.core.security import require_permission
from app.models.user import User
from app.repositories.liga_examen_diagnostico_repository import (
    LigaExamenDiagnosticoRepository,
)
from app.schemas.liga_examen_diagnostico import (
    LigaExamenDiagnosticoCreate,
    LigaExamenDiagnosticoListResponse,
    LigaExamenDiagnosticoRead,
    LigaExamenDiagnosticoUpdate,
)

router = APIRouter()


@router.get(
    "",
    response_model=LigaExamenDiagnosticoListResponse,
    summary="Listar ligas visibles (público para alumnos)",
)
async def list_ligas_visibles(db: DbSession):
    repo = LigaExamenDiagnosticoRepository(db)
    items, total = await repo.list(solo_visibles=True)
    return LigaExamenDiagnosticoListResponse(
        items=[LigaExamenDiagnosticoRead.model_validate(i) for i in items],
        total=total,
    )


@router.get(
    "/admin",
    response_model=LigaExamenDiagnosticoListResponse,
    summary="Listar todas las ligas (admin)",
)
async def list_ligas_admin(
    db: DbSession,
    _current_user: User = Depends(require_permission("gestionar_ligas")),
):
    repo = LigaExamenDiagnosticoRepository(db)
    items, total = await repo.list(solo_visibles=False)
    return LigaExamenDiagnosticoListResponse(
        items=[LigaExamenDiagnosticoRead.model_validate(i) for i in items],
        total=total,
    )


@router.post(
    "",
    response_model=LigaExamenDiagnosticoRead,
    status_code=201,
    summary="Crear liga",
)
async def crear_liga(
    payload: LigaExamenDiagnosticoCreate,
    db: DbSession,
    _current_user: User = Depends(require_permission("gestionar_ligas")),
):
    repo = LigaExamenDiagnosticoRepository(db)
    liga = await repo.create(payload)
    return LigaExamenDiagnosticoRead.model_validate(liga)


@router.put(
    "/{liga_id}",
    response_model=LigaExamenDiagnosticoRead,
    summary="Editar liga",
)
async def actualizar_liga(
    liga_id: int,
    payload: LigaExamenDiagnosticoUpdate,
    db: DbSession,
    _current_user: User = Depends(require_permission("gestionar_ligas")),
):
    repo = LigaExamenDiagnosticoRepository(db)
    liga = await repo.update(liga_id, payload)
    if liga is None:
        raise HTTPException(status_code=404, detail="Liga no encontrada")
    return LigaExamenDiagnosticoRead.model_validate(liga)


@router.patch(
    "/{liga_id}/visibilidad",
    response_model=LigaExamenDiagnosticoRead,
    summary="Toggle visibilidad de liga",
)
async def toggle_visibilidad(
    liga_id: int,
    db: DbSession,
    _current_user: User = Depends(require_permission("gestionar_ligas")),
):
    repo = LigaExamenDiagnosticoRepository(db)
    liga = await repo.get_by_id(liga_id)
    if liga is None:
        raise HTTPException(status_code=404, detail="Liga no encontrada")
    liga = await repo.update(liga_id, LigaExamenDiagnosticoUpdate(visible=not liga.visible))
    return LigaExamenDiagnosticoRead.model_validate(liga)


@router.delete(
    "/{liga_id}",
    status_code=204,
    summary="Eliminar liga",
)
async def eliminar_liga(
    liga_id: int,
    db: DbSession,
    _current_user: User = Depends(require_permission("gestionar_ligas")),
):
    repo = LigaExamenDiagnosticoRepository(db)
    deleted = await repo.delete(liga_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Liga no encontrada")
