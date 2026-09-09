from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select

from app.api.deps import DbSession
from app.core.security import get_current_user, require_permission
from app.models.alumno import Alumno
from app.models.resultado_diagnostico import ResultadoDiagnostico
from app.models.user import User
from app.repositories.alumno_repository import AlumnoRepository
from app.repositories.diagnostico_repository import DiagnosticoRepository
from app.schemas.alumno import (
    AlumnoListResponse,
    AlumnoRead,
    DiagnosticoAlumnoResponse,
    MateriaResultado,
)
from app.services.feedback_service import (
    MATERIAS_NOMBRES,
    feedback_general,
    feedback_materia,
)

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


@router.get(
    "/me/diagnostico",
    response_model=DiagnosticoAlumnoResponse,
    summary="Consultar mis resultados de diagnóstico",
)
async def mi_diagnostico(
    db: DbSession,
    periodo: str | None = Query(default=None, description="Periodo a consultar"),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Alumno).where(Alumno.usuario_id == current_user.id)
    result = await db.execute(stmt)
    alumno = result.scalars().first()
    if not alumno:
        raise HTTPException(status_code=404, detail="No se encontró tu registro de alumno")

    repo = DiagnosticoRepository(db)

    if periodo:
        resultado = await repo.get_resultado(alumno.id, periodo)
    else:
        stmt_latest = (
            select(ResultadoDiagnostico)
            .where(ResultadoDiagnostico.alumno_id == alumno.id)
            .order_by(ResultadoDiagnostico.created_at.desc())
            .limit(1)
        )
        resultado = (await db.execute(stmt_latest)).scalars().first()

    if not resultado:
        raise HTTPException(status_code=404, detail="No tienes resultados de diagnóstico registrados")

    materias_data = [
        ("algebra", resultado.puntaje_algebra),
        ("trigonometria", resultado.puntaje_trigonometria),
        ("geometria", resultado.puntaje_geometria),
        ("calculo", resultado.puntaje_calculo),
    ]

    materias: list[MateriaResultado] = []
    niveles: list[str] = []

    for materia_key, puntaje in materias_data:
        if puntaje is not None:
            nivel, texto = feedback_materia(materia_key, puntaje)
        else:
            nivel, texto = "Sin datos", "Esta materia no ha sido evaluada."
        niveles.append(nivel)
        materias.append(
            MateriaResultado(
                materia=materia_key,
                nombre=MATERIAS_NOMBRES.get(materia_key, materia_key),
                puntaje=puntaje,
                nivel=nivel,
                retroalimentacion=texto,
            )
        )

    nivel_gen, texto_gen = feedback_general(resultado.promedio_diagnostico, niveles)

    return DiagnosticoAlumnoResponse(
        periodo=resultado.periodo,
        promedio=resultado.promedio_diagnostico,
        nivel_general=nivel_gen,
        retroalimentacion_general=texto_gen,
        materias=materias,
    )