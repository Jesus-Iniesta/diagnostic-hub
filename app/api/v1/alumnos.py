from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import select

from app.api.deps import DbSession
from app.core.security import get_current_user, require_permission
from app.models.alumno import Alumno
from app.models.resultado_diagnostico import ResultadoDiagnostico
from app.models.resultado_webassign import ResultadoWebAssign
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
    feedback_final,
    feedback_general,
    feedback_materia,
)
from app.services.pdf_service import generar_pdf_correo, generar_pdf_resultado

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
    "/me/correo-pdf",
    summary="Descargar PDF con datos de correo del alumno",
)
async def mi_correo_pdf(
    db: DbSession,
    current_user: User = Depends(get_current_user),
):
    stmt = select(Alumno).where(Alumno.usuario_id == current_user.id)
    result = await db.execute(stmt)
    alumno = result.scalars().first()
    if not alumno:
        raise HTTPException(status_code=404, detail="No se encontró tu registro de alumno")

    nombre_completo = (
        f"{current_user.apellido_paterno} {current_user.apellido_materno} "
        f"{current_user.nombre}"
    ).strip()

    pdf_bytes = generar_pdf_correo(
        nombre_completo=nombre_completo,
        numero_cuenta=alumno.numero_cuenta,
        correo_personal=current_user.correo_personal,
        correo_institucional=current_user.correo_institucional,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="correo_{alumno.numero_cuenta or current_user.id}.pdf"'
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

    stmt_diag = (
        select(ResultadoDiagnostico)
        .where(ResultadoDiagnostico.alumno_id == alumno.id)
        .order_by(ResultadoDiagnostico.created_at.desc())
        .limit(1)
    )
    diag = (await db.execute(stmt_diag)).scalars().first()

    stmt_wa = (
        select(ResultadoWebAssign)
        .where(ResultadoWebAssign.alumno_id == alumno.id)
        .order_by(ResultadoWebAssign.created_at.desc())
        .limit(1)
    )
    wa = (await db.execute(stmt_wa)).scalars().first()

    periodo = (diag or wa).periodo if (diag or wa) else None

    diagnostico: dict | None = None
    if diag:
        dematerias = [
            {"nombre": name, "puntaje": getattr(diag, key)}
            for key, name in [
                ("puntaje_algebra", MATERIAS_NOMBRES["algebra"]),
                ("puntaje_trigonometria", MATERIAS_NOMBRES["trigonometria"]),
                ("puntaje_geometria", MATERIAS_NOMBRES["geometria"]),
                ("puntaje_calculo", MATERIAS_NOMBRES["calculo"]),
            ]
        ]
        diagnostico = {
            "promedio": diag.promedio_diagnostico,
            "materias": dematerias,
        }

    webassign: dict | None = None
    wa_promedio: float | None = None
    if wa:
        wamaterias = []
        wa_vals = []
        for key, nombre in [
            ("algebra", MATERIAS_NOMBRES["algebra"]),
            ("trigonometria", MATERIAS_NOMBRES["trigonometria"]),
            ("geometria", MATERIAS_NOMBRES["geometria"]),
        ]:
            trabajo = getattr(wa, f"{key}_trabajo")
            examen = getattr(wa, f"{key}_examen")
            vals = [v for v in [trabajo, examen] if v is not None]
            promedio_materia = round(sum(vals) / len(vals), 2) if vals else None
            if promedio_materia is not None:
                wa_vals.append(promedio_materia)
            wamaterias.append({
                "nombre": nombre,
                "trabajo": trabajo,
                "examen": examen,
            })
        wa_promedio = round(sum(wa_vals) / len(wa_vals), 2) if wa_vals else None
        webassign = {
            "promedio": wa_promedio,
            "materias": wamaterias,
        }

    diag_promedio = diag.promedio_diagnostico if diag else None
    promedios = [p for p in [diag_promedio, wa_promedio] if p is not None]
    promedio_final = round(sum(promedios) / len(promedios), 2) if promedios else None

    nivel_final, leyenda_final = feedback_final(
        promedio_final,
        tiene_diag=diag is not None,
        tiene_wa=wa is not None,
    )

    nombre_completo = (
        f"{current_user.apellido_paterno} {current_user.apellido_materno} "
        f"{current_user.nombre}"
    ).strip()

    pdf_bytes = generar_pdf_resultado(
        nombre_completo=nombre_completo,
        numero_cuenta=alumno.numero_cuenta,
        periodo=periodo,
        diagnostico=diagnostico,
        webassign=webassign,
        promedio_final=promedio_final,
        nivel_final=nivel_final,
        leyenda_final=leyenda_final,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="resultado_{alumno.numero_cuenta or current_user.id}.pdf"'
            )
        },
    )