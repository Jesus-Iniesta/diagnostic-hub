from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.security import get_current_user
from app.models.alumno import Alumno
from app.models.grupo import Grupo
from app.models.ingenieria import Ingenieria
from app.models.materia import Materia
from app.models.role import Role
from app.models.user import AuthMethod, User
from app.repositories.grupo_repository import GrupoRepository
from app.repositories.materia_repository import MateriaRepository
from app.schemas.grupo import (
    GrupoAlumnoAdd,
    GrupoAlumnoResponse,
    GrupoCreate,
    GrupoEstadisticas,
    GrupoResumen,
    GrupoResponse,
    MateriaResponse,
)
from app.services.upload_grupo_service import parse_profesor_excel

router = APIRouter(prefix="/profesor", tags=["profesor-grupos"])


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
    materia = await db.scalar(
        select(Materia).where(Materia.clave == data.materia_clave)
    )
    if not materia:
        raise HTTPException(status_code=400, detail="Materia no encontrada")

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


@router.get("/grupos/{grupo_id}/estadisticas", response_model=GrupoEstadisticas)
async def estadisticas_grupo(
    grupo_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    periodo: str = "2026B",
) -> GrupoEstadisticas:
    repo = GrupoRepository(db)
    if not await repo.is_profesor_of_grupo(current_user.id, grupo_id):
        raise HTTPException(status_code=403, detail="No tienes acceso a este grupo")

    stats = await repo.get_estadisticas_grupo(grupo_id, periodo)
    return GrupoEstadisticas(**stats)


@router.post("/grupos/{grupo_id}/cargar-alumnos")
async def cargar_alumnos_excel(
    grupo_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    periodo: str = "2026B",
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

    # Get the grupo to know its period
    stmt_grupo = select(Grupo).where(Grupo.id == grupo_id)
    result_grupo = await db.execute(stmt_grupo)
    grupo_obj = result_grupo.scalars().first()
    grupo_periodo = grupo_obj.periodo if grupo_obj else periodo

    # Get role "alumno" for auto-registration
    role_alumno = await db.scalar(select(Role).where(Role.name == "alumno"))

    added = 0
    skipped = 0
    registered = 0

    for alumno_data in alumnos_data:
        alumno = await repo.find_alumno_by_cuenta(alumno_data["numero_cuenta"])
        if not alumno:
            # Auto-register: create User + Alumno
            try:
                # Extract carrera clave from plan_estudios (e.g. "ICO-F19" → "ICO")
                ingenieria = None
                plan = alumno_data.get("plan_estudios")
                if plan:
                    clave_carrera = plan.split("-")[0].strip().upper()
                    ingenieria = await db.scalar(
                        select(Ingenieria).where(Ingenieria.clave == clave_carrera)
                    )

                # Create User
                user = User(
                    nombre=alumno_data["nombre"],
                    apellido_paterno=alumno_data["apellido_paterno"],
                    apellido_materno=alumno_data["apellido_materno"],
                    correo_personal=f"{alumno_data['numero_cuenta']}@pendiente.edu.mx",
                    correo_institucional=alumno_data.get("correo_institucional"),
                    auth_method=AuthMethod.NUMERO_CUENTA,
                    activo=True,
                    role_id=role_alumno.id if role_alumno else None,
                )
                db.add(user)
                await db.flush()

                # Create Alumno
                nuevo_alumno = Alumno(
                    usuario_id=user.id,
                    ingenieria_id=ingenieria.id if ingenieria else None,
                    numero_cuenta=alumno_data["numero_cuenta"],
                    periodo_ingreso=grupo_periodo,
                )
                db.add(nuevo_alumno)
                await db.flush()

                alumno = nuevo_alumno
                registered += 1
            except (IntegrityError, ValueError):
                # Skip if creation fails (e.g. duplicate)
                continue

        result = await repo.add_alumno(grupo_id, alumno.id, periodo)
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
        "registrados_nuevos": registered,
        "duplicados_en_grupo": skipped,
        "errores_archivo": len(errores),
        "detalles_errores": errores[:10],
    }
