from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.security import get_current_user, require_permission
from app.models.grupo import Grupo
from app.models.materia import Materia
from app.models.user import User
from app.repositories.grupo_repository import GrupoRepository, nombre_propio
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
    ResumenProfesor,
)
from app.services.indice_fi_service import (
    indices_alumnos,
    maximo_indice,
    obtener_config,
    periodo_actual,
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


def _materia_nombre(grupo: Grupo) -> str:
    """La materia como la escribió el profesor; los grupos anteriores usan la del catálogo."""
    return grupo.materia_nombre or (grupo.materia.nombre if grupo.materia else "")


def _promedio_indice(indices: list[dict]) -> float | None:
    evaluados = [i["indice"] for i in indices if i["tiene_resultados"]]
    return round(sum(evaluados) / len(evaluados), 2) if evaluados else None


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
            materia_nombre=_materia_nombre(g),
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
    grupo.materia_nombre = materia_nombre or materia.nombre
    await db.commit()
    return GrupoResponse(
        id=grupo.id,
        nombre=grupo.nombre,
        materia_clave=materia.clave,
        materia_nombre=grupo.materia_nombre,
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

    # Índice del periodo pedido o, si no se indica, el más reciente de cada
    # alumno (el mismo que ve el alumno en su carta).
    alumnos = await repo.get_alumnos(grupo_id)
    indices = await indices_alumnos(db, [a.id for a in alumnos], periodo)
    rows = []
    for alumno in alumnos:
        indice = indices[alumno.id]
        final = indice["filas"]["final"]
        evaluado = indice["tiene_resultados"]
        rows.append(GrupoAlumnoResponse(
            alumno_id=alumno.id,
            nombre=nombre_propio(
                alumno.usuario.nombre,
                alumno.usuario.apellido_paterno,
                alumno.usuario.apellido_materno,
            ),
            numero_cuenta=alumno.numero_cuenta or "",
            ingenieria_clave=alumno.ingenieria.clave if alumno.ingenieria else "",
            indice=indice["indice"] if evaluado else None,
            maximo=indice["maximo"],
            categoria=indice["categoria"]["nombre"] if evaluado and indice["categoria"] else None,
            examen_final=final.promedio_diagnostico if final else None,
        ))
    rows.sort(key=lambda r: r.nombre)
    return rows


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

    grupo = await db.get(Grupo, grupo_id)
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    alumnos = await repo.get_alumnos(grupo_id)
    indices = list((await indices_alumnos(db, [a.id for a in alumnos], periodo)).values())
    evaluados = [i for i in indices if i["tiene_resultados"]]

    # Las categorías son las que configuró el coordinador para el periodo del grupo.
    config = await obtener_config(db, periodo or grupo.periodo)
    orden = sorted(config["categorias"], key=lambda c: c["minimo"], reverse=True)
    conteo: dict[str, int] = {c["nombre"]: 0 for c in orden}
    for i in evaluados:
        if i["categoria"]:
            nombre = i["categoria"]["nombre"]
            conteo[nombre] = conteo.get(nombre, 0) + 1

    return GrupoEstadisticas(
        grupo_id=grupo_id,
        nombre=grupo.nombre,
        total_alumnos=len(alumnos),
        evaluados=len(evaluados),
        promedio_indice=_promedio_indice(evaluados),
        maximo=maximo_indice(config["valores"], config["usar_asistencia"]),
        distribucion=[
            {
                "categoria": nombre,
                "cantidad": cantidad,
                "porcentaje": round(cantidad / len(evaluados) * 100, 1) if evaluados else 0,
            }
            for nombre, cantidad in conteo.items()
        ],
    )


@router.get("/resumen", response_model=ResumenProfesor)
async def resumen_profesor(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ResumenProfesor:
    """Resumen de Inicio: alumnos de todos sus grupos (sin repetir) y cada grupo."""
    repo = GrupoRepository(db)
    grupos = await repo.list_by_profesor(current_user.id)
    alumnos_por_grupo = {g.id: [a.id for a in await repo.get_alumnos(g.id)] for g in grupos}
    todos = list(dict.fromkeys(a for ids in alumnos_por_grupo.values() for a in ids))
    indices = await indices_alumnos(db, todos)
    evaluados = [i for i in indices.values() if i["tiene_resultados"]]

    if evaluados:
        maximo = max(i["maximo"] for i in evaluados)
    else:
        config = await obtener_config(db, periodo_actual())
        maximo = maximo_indice(config["valores"], config["usar_asistencia"])

    return ResumenProfesor(
        total_alumnos=len(todos),
        evaluados=len(evaluados),
        promedio_indice=_promedio_indice(evaluados),
        maximo=maximo,
        grupos=[
            {
                "id": g.id,
                "nombre": g.nombre,
                "materia_nombre": _materia_nombre(g),
                "periodo": g.periodo,
                "total_alumnos": len(alumnos_por_grupo[g.id]),
                "evaluados": sum(
                    1 for a in alumnos_por_grupo[g.id] if indices[a]["tiene_resultados"]
                ),
                "promedio_indice": _promedio_indice(
                    [indices[a] for a in alumnos_por_grupo[g.id]]
                ),
            }
            for g in sorted(grupos, key=lambda g: (g.periodo, g.nombre), reverse=True)
        ],
    )


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
                "nombre": nombre_propio(
                    alumno_data["nombre"],
                    alumno_data["apellido_paterno"],
                    alumno_data["apellido_materno"],
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
