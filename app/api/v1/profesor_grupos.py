from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.security import get_current_user
from app.models.ingenieria import Ingenieria
from app.models.user import User
from app.repositories.grupo_repository import GrupoRepository
from app.schemas.grupo import (
    GrupoAlumnoAdd,
    GrupoAlumnoResponse,
    GrupoCreate,
    GrupoResumen,
    GrupoResponse,
)
from sqlalchemy import select

router = APIRouter(prefix="/profesor", tags=["profesor-grupos"])


@router.get("/grupos", response_model=list[GrupoResponse])
async def mis_grupos(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    periodo: str | None = None,
) -> list[GrupoResponse]:
    repo = GrupoRepository(db)
    grupos = await repo.list_by_profesor(current_user.id, periodo)
    result = []
    for g in grupos:
        total = await repo.count_alumnos(g.id)
        result.append(GrupoResponse(
            id=g.id,
            nombre=g.nombre,
            ingenieria_clave=g.ingenieria.clave if g.ingenieria else "",
            ingenieria_nombre=g.ingenieria.nombre if g.ingenieria else "",
            periodo=g.periodo,
            activo=g.activo,
            total_alumnos=total,
        ))
    return result


@router.post("/grupos", response_model=GrupoResponse, status_code=201)
async def crear_grupo(
    data: GrupoCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GrupoResponse:
    ingenieria = await db.scalar(
        select(Ingenieria).where(Ingenieria.clave == data.ingenieria_clave)
    )
    if not ingenieria:
        raise HTTPException(status_code=400, detail="Ingeniería no encontrada")

    repo = GrupoRepository(db)
    grupo = await repo.create(
        nombre=data.nombre,
        ingenieria_id=ingenieria.id,
        periodo=data.periodo,
        profesor_user_id=current_user.id,
    )
    await db.commit()
    return GrupoResponse(
        id=grupo.id,
        nombre=grupo.nombre,
        ingenieria_clave=ingenieria.clave,
        ingenieria_nombre=ingenieria.nombre,
        periodo=grupo.periodo,
        activo=grupo.activo,
    )


@router.delete("/grupos/{grupo_id}", status_code=204)
async def eliminar_grupo(
    grupo_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    repo = GrupoRepository(db)
    if not await repo.is_profesor_of_grupo(current_user.id, grupo_id):
        raise HTTPException(status_code=403, detail="No tienes acceso a este grupo")
    await repo.delete(grupo_id)
    await db.commit()


@router.get("/grupos/{grupo_id}/alumnos", response_model=list[GrupoAlumnoResponse])
async def alumnos_grupo(
    grupo_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    periodo: str | None = None,
) -> list[GrupoAlumnoResponse]:
    repo = GrupoRepository(db)
    if not await repo.is_profesor_of_grupo(current_user.id, grupo_id):
        raise HTTPException(status_code=403, detail="No tienes acceso a este grupo")

    if periodo:
        rows = await repo.get_grupo_alumno_with_diagnostico(grupo_id, periodo)
    else:
        alumnos = await repo.get_alumnos(grupo_id)
        rows = []
        for a in alumnos:
            rows.append({
                "alumno_id": a.id,
                "nombre": f"{a.usuario.nombre} {a.usuario.apellido_paterno} {a.usuario.apellido_materno}",
                "numero_cuenta": a.numero_cuenta or "",
                "ingenieria_clave": a.ingenieria.clave if a.ingenieria else "",
                "puntaje": None,
                "nivel": None,
            })

    return [GrupoAlumnoResponse(**r) for r in rows]


@router.post("/grupos/{grupo_id}/alumnos", status_code=201)
async def agregar_alumno(
    grupo_id: int,
    data: GrupoAlumnoAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    periodo: str = "2026B",
) -> dict:
    repo = GrupoRepository(db)
    if not await repo.is_profesor_of_grupo(current_user.id, grupo_id):
        raise HTTPException(status_code=403, detail="No tienes acceso a este grupo")

    alumno = await repo.find_alumno_by_cuenta(data.numero_cuenta)
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")

    added = await repo.add_alumno(grupo_id, alumno.id, periodo)
    if not added:
        raise HTTPException(status_code=409, detail="El alumno ya está en este grupo")

    await db.commit()
    return {"ok": True, "alumno_id": alumno.id}


@router.delete("/grupos/{grupo_id}/alumnos/{alumno_id}", status_code=204)
async def quitar_alumno(
    grupo_id: int,
    alumno_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    repo = GrupoRepository(db)
    if not await repo.is_profesor_of_grupo(current_user.id, grupo_id):
        raise HTTPException(status_code=403, detail="No tienes acceso a este grupo")

    removed = await repo.remove_alumno(grupo_id, alumno_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Alumno no encontrado en el grupo")

    await db.commit()


@router.get("/grupos/{grupo_id}/resumen", response_model=GrupoResumen)
async def resumen_grupo(
    grupo_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    periodo: str = "2026B",
) -> GrupoResumen:
    repo = GrupoRepository(db)
    if not await repo.is_profesor_of_grupo(current_user.id, grupo_id):
        raise HTTPException(status_code=403, detail="No tienes acceso a este grupo")

    resumen = await repo.get_resumen(grupo_id, periodo)
    return GrupoResumen(**resumen)
