from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.security import get_current_user, require_permission
from app.models.grupo import Grupo
from app.models.materia import Materia
from app.models.user import User
from app.repositories.grupo_repository import GrupoRepository
from app.repositories.materia_repository import MateriaRepository, limpiar_nombre_materia
from app.schemas.grupo import (
    GrupoAlumnoAdd,
    GrupoAlumnoResponse,
    GrupoCreate,
    GrupoCreani,
    GrupoEstadisticas,
    GrupoResumen,
    GrupoResponse,
    MateriaResponse,
)
from app.services.normalizacion import normalizar_correo, normalizar_cuenta
from app.services.reportes_service import resumen_creani_alumnos
from app.services.upload_diagnostico_service import find_alumno, load_all_alumnos
from app.services.upload_grupo_service import parse_profesor_excel

# Solo profesor y administrador tienen este permiso; alumno y acreditador
# reciben 403 en todas las rutas de /profesor/*.
router = APIRouter(
    prefix="/profesor",
    tags=["profesor-grupos"],
    dependencies=[Depends(require_permission("consultar_resultados_grupo"))],
)


async def _periodo_grupo(db: AsyncSession, grupo_id: int) -> str:
    """Periodo con el que se inscribe a los alumnos en el grupo."""
    periodo = await db.scalar(select(Grupo.periodo).where(Grupo.id == grupo_id))
    if not periodo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    return periodo


@router.get("/materias", response_model=list[MateriaResponse])
async def listar_materias(
    db: AsyncSession = Depends(get_db),
) -> list[MateriaResponse]:
    repo = MateriaRepository(db)
    materias = await repo.list()
    return [MateriaResponse(id=m.id, clave=m.clave, nombre=m.nombre) for m in materias]


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
            materia_clave=g.materia.clave if g.materia else "",
            materia_nombre=g.materia.nombre if g.materia else "",
            periodo=g.periodo,
            activo=g.activo,
            nombre_archivo=g.nombre_archivo,
            total_alumnos=total,
        ))
    return result


@router.post("/grupos", response_model=GrupoResponse, status_code=201)
async def crear_grupo(
    data: GrupoCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GrupoResponse:
    materia_nombre = limpiar_nombre_materia(data.materia_nombre or "")
    if materia_nombre:
        if len(materia_nombre) > 100:
            raise HTTPException(
                status_code=400, detail="El nombre de la materia es muy largo"
            )
        materia = await MateriaRepository(db).get_or_create_by_nombre(materia_nombre)
    elif data.materia_clave:
        materia = await db.scalar(
            select(Materia).where(Materia.clave == data.materia_clave)
        )
        if not materia:
            raise HTTPException(status_code=400, detail="Materia no encontrada")
    else:
        raise HTTPException(status_code=400, detail="Escribe la materia")

    repo = GrupoRepository(db)
    grupo = await repo.create(
        nombre=data.nombre,
        materia_id=materia.id,
        periodo=data.periodo,
        profesor_user_id=current_user.id,
    )
    await db.commit()
    return GrupoResponse(
        id=grupo.id,
        nombre=grupo.nombre,
        materia_clave=materia.clave,
        materia_nombre=materia.nombre,
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

    # Puntaje y nivel del examen final: el del periodo pedido o, si no se
    # indica, el más reciente de cada alumno.
    rows = await repo.get_grupo_alumno_with_diagnostico(grupo_id, periodo)
    return [GrupoAlumnoResponse(**r) for r in rows]


@router.post("/grupos/{grupo_id}/alumnos", status_code=201)
async def agregar_alumno(
    grupo_id: int,
    data: GrupoAlumnoAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = GrupoRepository(db)
    if not await repo.is_profesor_of_grupo(current_user.id, grupo_id):
        raise HTTPException(status_code=403, detail="No tienes acceso a este grupo")
    periodo = await _periodo_grupo(db, grupo_id)

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
    periodo: str | None = None,
) -> GrupoResumen:
    repo = GrupoRepository(db)
    if not await repo.is_profesor_of_grupo(current_user.id, grupo_id):
        raise HTTPException(status_code=403, detail="No tienes acceso a este grupo")

    resumen = await repo.get_resumen(grupo_id, periodo)
    return GrupoResumen(**resumen)


@router.get("/grupos/{grupo_id}/estadisticas", response_model=GrupoEstadisticas)
async def estadisticas_grupo(
    grupo_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    periodo: str | None = None,
) -> GrupoEstadisticas:
    repo = GrupoRepository(db)
    if not await repo.is_profesor_of_grupo(current_user.id, grupo_id):
        raise HTTPException(status_code=403, detail="No tienes acceso a este grupo")

    stats = await repo.get_estadisticas_grupo(grupo_id, periodo)
    return GrupoEstadisticas(**stats)


@router.get("/grupos/{grupo_id}/creani", response_model=GrupoCreani)
async def creani_grupo(
    grupo_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    periodo: str | None = None,
) -> GrupoCreani:
    repo = GrupoRepository(db)
    if not await repo.is_profesor_of_grupo(current_user.id, grupo_id):
        raise HTTPException(status_code=403, detail="No tienes acceso a este grupo")

    alumnos = await repo.get_alumnos(grupo_id)
    resumen = await resumen_creani_alumnos(db, [a.id for a in alumnos], periodo)
    return GrupoCreani(**resumen)


@router.post("/grupos/{grupo_id}/cargar-alumnos")
async def cargar_alumnos_excel(
    grupo_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repo = GrupoRepository(db)
    if not await repo.is_profesor_of_grupo(current_user.id, grupo_id):
        raise HTTPException(status_code=403, detail="No tienes acceso a este grupo")

    if not file.filename or not file.filename.upper().endswith((".XLS", ".XLSX")):
        raise HTTPException(status_code=400, detail="El archivo debe ser .xls o .xlsx")

    if not file.filename.upper().startswith(("LN", "LIN")):
        raise HTTPException(
            status_code=400,
            detail="El nombre del archivo debe comenzar con LN o LIN (ej. LINC05-CALCULO III-02 1)",
        )

    contents = await file.read()
    alumnos_data, errores = parse_profesor_excel(contents, file.filename)
    periodo = await _periodo_grupo(db, grupo_id)

    # Solo se agregan alumnos que ya existen: se buscan por número de cuenta o
    # correo institucional, incluidos los aprendidos en otras cargas
    # (identificador_alumno). Los que no existen se reportan, no se crean.
    email_map, cuenta_map, folio_map, _ = await load_all_alumnos(db)

    added = 0
    skipped = 0
    no_encontrados: list[dict] = []

    for alumno_data in alumnos_data:
        cuenta = normalizar_cuenta(alumno_data["numero_cuenta"])
        correo = normalizar_correo(alumno_data.get("correo_institucional"))
        alumno_id = find_alumno(correo, cuenta, None, email_map, cuenta_map, folio_map)
        if alumno_id is None:
            no_encontrados.append({
                "numero_cuenta": alumno_data["numero_cuenta"],
                "nombre": " ".join(
                    p for p in (
                        alumno_data["nombre"],
                        alumno_data["apellido_paterno"],
                        alumno_data["apellido_materno"],
                    ) if p
                ),
                "correo": alumno_data.get("correo_institucional"),
            })
            continue

        result = await repo.add_alumno(grupo_id, alumno_id, periodo)
        if result:
            added += 1
        else:
            skipped += 1

    await db.commit()

    # Update grupo with filename
    stmt = select(Grupo).where(Grupo.id == grupo_id)
    result = await db.execute(stmt)
    grupo = result.scalars().first()
    if grupo:
        grupo.nombre_archivo = file.filename
        await db.commit()

    return {
        "ok": True,
        "total_en_archivo": len(alumnos_data),
        "agregados": added,
        "duplicados_en_grupo": skipped,
        "no_encontrados": no_encontrados,
        "errores_archivo": len(errores),
        "detalles_errores": errores[:10],
    }
