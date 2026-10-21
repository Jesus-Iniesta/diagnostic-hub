from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import select

from app.api.deps import DbSession
from app.core.security import get_current_user, require_permission
from app.models.alumno import Alumno
from app.models.ingenieria import Ingenieria
from app.models.resultado_cuestionario_diagnostico import ResultadoCuestionarioDiagnostico
from app.models.resultado_diagnostico import ResultadoDiagnostico
from app.models.resultado_webassign import ResultadoWebAssign
from app.models.user import User
from app.repositories.alumno_repository import AlumnoRepository
from app.repositories.diagnostico_repository import DiagnosticoRepository
from app.schemas.alumno import (
    AlumnoListResponse,
    AlumnoRead,
    CuestionarioAlumnoResponse,
    CuestionarioMateriaResultado,
    DiagnosticoAlumnoResponse,
    IndiceFiAlumnoResponse,
    MateriaResultado,
)
from app.services.feedback_service import (
    MATERIAS_NOMBRES,
    feedback_general,
    feedback_materia,
    nivel_puntaje,
)
from app.services.indice_fi_service import (
    MATERIAS_DIAGNOSTICO,
    MATERIAS_FINAL,
    MATERIAS_WEBASSIGN,
    indices_alumnos,
)
from app.services.pdf_service import generar_pdf_correos, generar_pdf_resultado
from app.services.upload_diagnostico_service import normalizar_periodo

router = APIRouter()

MENSAJE_COMPLETAR_DATOS = "Completa tus datos antes de ver tus resultados."


def _exigir_datos_completos(alumno: Alumno) -> None:
    """Un alumno creado desde los exámenes que entró solo con su número de
    cuenta debe completar sus datos antes de ver sus resultados."""
    if alumno.es_provisional:
        raise HTTPException(status_code=403, detail=MENSAJE_COMPLETAR_DATOS)


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
    _exigir_datos_completos(alumno)

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


@router.get(
    "/me/cuestionario",
    response_model=CuestionarioAlumnoResponse,
    summary="Consultar mis resultados del examen diagnóstico (cuestionarios 1 y 2)",
)
async def mi_cuestionario(
    db: DbSession,
    current_user: User = Depends(get_current_user),
):
    stmt = select(Alumno).where(Alumno.usuario_id == current_user.id)
    alumno = (await db.execute(stmt)).scalars().first()
    if not alumno:
        raise HTTPException(status_code=404, detail="No se encontró tu registro de alumno")
    _exigir_datos_completos(alumno)

    resultados = (await db.execute(
        select(ResultadoCuestionarioDiagnostico).where(
            ResultadoCuestionarioDiagnostico.alumno_id == alumno.id
        )
    )).scalars().all()
    if not resultados:
        raise HTTPException(
            status_code=404, detail="No tienes resultados del examen diagnóstico registrados"
        )
    # El más reciente: por periodo (2026B > 2026A) y luego por actualización.
    resultado = max(
        resultados, key=lambda r: (normalizar_periodo(r.periodo) or "", r.updated_at)
    )

    materias: list[CuestionarioMateriaResultado] = []
    for materia_key in ("algebra", "trigonometria", "geometria", "calculo"):
        c1 = getattr(resultado, f"aciertos_c1_{materia_key}")
        c2 = getattr(resultado, f"aciertos_c2_{materia_key}")
        # Igual que en los reportes: (aciertos c1 + aciertos c2) * 0.5, sobre 10.
        calificacion = None if c1 is None and c2 is None else ((c1 or 0) + (c2 or 0)) * 0.5
        materias.append(CuestionarioMateriaResultado(
            materia=materia_key,
            nombre=MATERIAS_NOMBRES.get(materia_key, materia_key),
            aciertos_c1=c1,
            aciertos_c2=c2,
            calificacion=calificacion,
            nivel=nivel_puntaje(calificacion) if calificacion is not None else "Sin datos",
        ))

    calificaciones = [m.calificacion for m in materias if m.calificacion is not None]
    promedio = round(sum(calificaciones) / len(calificaciones), 2) if calificaciones else None
    return CuestionarioAlumnoResponse(
        periodo=resultado.periodo,
        promedio=promedio,
        nivel_general=nivel_puntaje(promedio) if promedio is not None else "Sin datos",
        materias=materias,
    )


@router.get(
    "/me/webassign",
    summary="Consultar mis resultados WebAssign",
)
async def mi_webassign(
    db: DbSession,
    periodo: str | None = Query(default=None, description="Periodo a consultar"),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Alumno).where(Alumno.usuario_id == current_user.id)
    result = await db.execute(stmt)
    alumno = result.scalars().first()
    if not alumno:
        raise HTTPException(status_code=404, detail="No se encontró tu registro de alumno")
    _exigir_datos_completos(alumno)

    if periodo:
        stmt_r = select(ResultadoWebAssign).where(
            ResultadoWebAssign.alumno_id == alumno.id,
            ResultadoWebAssign.periodo == periodo,
        )
    else:
        stmt_r = (
            select(ResultadoWebAssign)
            .where(ResultadoWebAssign.alumno_id == alumno.id)
            .order_by(ResultadoWebAssign.created_at.desc())
            .limit(1)
        )
    resultado = (await db.execute(stmt_r)).scalars().first()

    if not resultado:
        raise HTTPException(status_code=404, detail="No tienes resultados WebAssign registrados")

    def score_nivel(val: float | None) -> tuple[str, str]:
        if val is None:
            return "Sin datos", ""
        if val >= 9:
            return "Alto", "Excelente desempeño"
        if val >= 7:
            return "Bueno", "Buen desempeño"
        if val >= 4.5:
            return "Medio", "Necesita reforzar"
        if val >= 2.5:
            return "Bajo", "Requiere atención"
        return "Muy bajo", "Comienza desde cero"

    materias = []
    for materia_key, nombre in [
        ("algebra", "Álgebra"),
        ("trigonometria", "Trigonometría"),
        ("geometria", "Geometría Analítica"),
    ]:
        trabajo = getattr(resultado, f"{materia_key}_trabajo")
        examen = getattr(resultado, f"{materia_key}_examen")
        vals = [v for v in [trabajo, examen] if v is not None]
        promedio_materia = round(sum(vals) / len(vals), 2) if vals else None
        nivel_materia, texto_materia = score_nivel(promedio_materia)
        materias.append({
            "materia": materia_key,
            "nombre": nombre,
            "trabajo": trabajo,
            "examen": examen,
            "promedio": promedio_materia,
            "nivel": nivel_materia,
            "retroalimentacion": texto_materia,
        })

    promedio_vals = [m["promedio"] for m in materias if m["promedio"] is not None]
    promedio_general = round(sum(promedio_vals) / len(promedio_vals), 2) if promedio_vals else None
    nivel_gen, _ = score_nivel(promedio_general)

    return {
        "periodo": resultado.periodo,
        "carrera": resultado.carrera,
        "promedio": promedio_general,
        "nivel_general": nivel_gen,
        "materias": materias,
    }


@router.get(
    "/me/indice-fi",
    response_model=IndiceFiAlumnoResponse,
    summary="Mi Índice FI UAEMex (el mismo de la carta de recomendación)",
)
async def mi_indice_fi(
    db: DbSession,
    current_user: User = Depends(get_current_user),
):
    stmt = select(Alumno).where(Alumno.usuario_id == current_user.id)
    alumno = (await db.execute(stmt)).scalars().first()
    if not alumno:
        raise HTTPException(status_code=404, detail="No se encontró tu registro de alumno")
    _exigir_datos_completos(alumno)

    indice = await _indice_fi_alumno(db, alumno.id)
    categoria = indice["categoria"]
    return IndiceFiAlumnoResponse(
        periodo=indice["periodo"],
        tiene_resultados=indice["tiene_resultados"],
        indice=indice["indice"],
        maximo=indice["maximo"],
        categoria=categoria["nombre"] if categoria else None,
        comentario=categoria["comentario"] if categoria else None,
    )


@router.get(
    "/me/correos-pdf",
    summary="Descargar PDF con los correos registrados del alumno",
)
async def mis_correos_pdf(
    db: DbSession,
    current_user: User = Depends(get_current_user),
):
    stmt = select(Alumno).where(Alumno.usuario_id == current_user.id)
    alumno = (await db.execute(stmt)).scalars().first()
    if not alumno:
        raise HTTPException(status_code=404, detail="No se encontró tu registro de alumno")

    nombre_completo = " ".join(
        p for p in (current_user.nombre, current_user.apellido_paterno, current_user.apellido_materno)
        if p
    )
    pdf_bytes = generar_pdf_correos(
        nombre_completo=nombre_completo,
        numero_cuenta=alumno.numero_cuenta,
        correo_personal=current_user.correo_personal,
        correo_institucional=current_user.correo_institucional,
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="correos_{alumno.numero_cuenta or current_user.id}.pdf"'
            )
        },
    )


@router.get(
    "/me/reporte-pdf",
    summary="Descargar PDF con el reporte de resultados del alumno",
)
async def mi_reporte_pdf(
    db: DbSession,
    current_user: User = Depends(get_current_user),
):
    stmt = select(Alumno).where(Alumno.usuario_id == current_user.id)
    result = await db.execute(stmt)
    alumno = result.scalars().first()
    if not alumno:
        raise HTTPException(status_code=404, detail="No se encontró tu registro de alumno")
    _exigir_datos_completos(alumno)

    indice = await _indice_fi_alumno(db, alumno.id)
    filas = indice["filas"]
    cuest, final, wa = filas["cuestionario"], filas["final"], filas["webassign"]

    # Todas las tablas son del mismo periodo que el índice.
    diagnostico: list[dict] | None = None
    if cuest:
        diagnostico = []
        for key in MATERIAS_DIAGNOSTICO:
            c1 = getattr(cuest, f"aciertos_c1_{key}")
            c2 = getattr(cuest, f"aciertos_c2_{key}")
            # Igual que en Mis resultados: (aciertos c1 + aciertos c2) * 0.5, sobre 10.
            calificacion = None if c1 is None and c2 is None else ((c1 or 0) + (c2 or 0)) * 0.5
            diagnostico.append({
                "nombre": MATERIAS_NOMBRES[key],
                "c1": c1,
                "c2": c2,
                "calificacion": calificacion,
            })

    examen_final: list[dict] | None = None
    if final:
        examen_final = [
            {"nombre": MATERIAS_NOMBRES[key], "puntaje": getattr(final, f"puntaje_{key}")}
            for key in MATERIAS_FINAL
        ]

    webassign: list[dict] | None = None
    if wa:
        webassign = [
            {
                "nombre": MATERIAS_NOMBRES[key],
                "trabajo": getattr(wa, f"{key}_trabajo"),
                "examen": getattr(wa, f"{key}_examen"),
            }
            for key in MATERIAS_WEBASSIGN
        ]

    ingenieria = (
        await db.get(Ingenieria, alumno.ingenieria_id) if alumno.ingenieria_id else None
    )
    nombre_completo = " ".join(
        p for p in (current_user.nombre, current_user.apellido_paterno, current_user.apellido_materno)
        if p
    )

    pdf_bytes = generar_pdf_resultado(
        nombre_completo=nombre_completo,
        numero_cuenta=alumno.numero_cuenta,
        ingenieria=ingenieria.nombre if ingenieria else None,
        periodo=indice["periodo"] if indice["tiene_resultados"] else None,
        diagnostico=diagnostico,
        examen_final=examen_final,
        webassign=webassign,
        indice=indice,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                "attachment; filename="
                f'"carta_recomendacion_{alumno.numero_cuenta or current_user.id}.pdf"'
            )
        },
    )


async def _indice_fi_alumno(db, alumno_id: int) -> dict:
    """Índice FI UAEMex del periodo más reciente en que el alumno tiene resultados."""
    return (await indices_alumnos(db, [alumno_id]))[alumno_id]
