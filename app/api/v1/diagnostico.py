from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response

from app.api.deps import DbSession
from app.core.security import require_permission
from app.models.user import User
from app.repositories.diagnostico_repository import DiagnosticoRepository
from app.schemas.diagnostico import (
    BuscarAlumnoResult,
    CorregirMatchingPayload,
    CrearAlumnoDiagnostico,
    RespuestaCorrectaBatch,
)
from app.services.upload_diagnostico_service import (
    corregir_matching_diagnostico,
    generate_excel_resultados,
    get_resultados_consolidados,
    procesar_examen_diagnostico,
)

router = APIRouter()

MATERIAS_VALIDAS = {"algebra", "trigonometria", "geometria", "calculo"}


@router.get(
    "/respuestas-correctas",
    summary="Obtener respuestas correctas de una materia",
)
async def get_respuestas_correctas(
    db: DbSession,
    materia: str = Query(...),
    periodo: str = Query(...),
    _current_user: User = Depends(require_permission("cargar_diagnostico")),
):
    if materia not in MATERIAS_VALIDAS:
        raise HTTPException(status_code=400, detail="Materia no válida")
    repo = DiagnosticoRepository(db)
    respuestas = await repo.get_respuestas_correctas(materia, periodo)
    return {
        "materia": materia,
        "periodo": periodo,
        "respuestas": [
            {"codigo": k, "respuesta_correcta": v}
            for k, v in sorted(respuestas.items())
        ],
    }


@router.put(
    "/respuestas-correctas",
    summary="Guardar respuestas correctas",
)
async def guardar_respuestas_correctas(
    db: DbSession,
    payload: RespuestaCorrectaBatch,
    _current_user: User = Depends(require_permission("cargar_diagnostico")),
):
    repo = DiagnosticoRepository(db)
    for r in payload.respuestas:
        await repo.upsert_respuesta_correcta(
            materia=r.materia,
            codigo=r.codigo,
            respuesta=r.respuesta_correcta,
            periodo=r.periodo,
        )
    await db.commit()
    return {"ok": True, "count": len(payload.respuestas)}


@router.post(
    "/upload",
    summary="Subir un examen diagnóstico (una materia)",
)
async def upload_diagnostico(
    db: DbSession,
    materia: str = Query(...),
    periodo: str = Query(...),
    _current_user: User = Depends(require_permission("cargar_diagnostico")),
    file: UploadFile = File(...),
):
    if materia not in MATERIAS_VALIDAS:
        raise HTTPException(status_code=400, detail="Materia no válida")
    if not file.filename:
        raise HTTPException(status_code=400, detail="No se proporcionó un archivo")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ("xlsx", "xls"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos .xlsx o .xls")
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="El archivo está vacío")
    try:
        resultado = await procesar_examen_diagnostico(db, content, materia, periodo)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al procesar: {exc}")
    return resultado


@router.get(
    "/resultados",
    summary="Obtener resultados consolidados de diagnóstico",
)
async def get_resultados(
    db: DbSession,
    periodo: str = Query(...),
    _current_user: User = Depends(require_permission("cargar_diagnostico")),
):
    consolidated = await get_resultados_consolidados(db, periodo)
    return {
        "periodo": periodo,
        "total": len(consolidated),
        "resultados": consolidated,
    }


@router.post(
    "/corregir-matching",
    summary="Corregir matching de alumnos no encontrados",
)
async def corregir_matching(
    db: DbSession,
    materia: str = Form(...),
    periodo: str = Form(...),
    correcciones_json: str = Form(...),
    _current_user: User = Depends(require_permission("cargar_diagnostico")),
    file: UploadFile = File(...),
):
    import json as _json

    try:
        correcciones = _json.loads(correcciones_json)
        payload = CorregirMatchingPayload(
            materia=materia,
            periodo=periodo,
            correcciones=correcciones,
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Payload inválido")

    if not file.filename:
        raise HTTPException(status_code=400, detail="No se proporcionó un archivo")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ("xlsx", "xls"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos .xlsx o .xls")
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="El archivo está vacío")

    try:
        resultado = await corregir_matching_diagnostico(
            db,
            materia=payload.materia,
            periodo=payload.periodo,
            file_bytes=content,
            correcciones=[c.model_dump() for c in payload.correcciones],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al corregir: {exc}")
    return resultado


@router.get(
    "/export",
    summary="Exportar resultados de diagnóstico como Excel",
)
async def export_excel(
    db: DbSession,
    periodo: str = Query(...),
    _current_user: User = Depends(require_permission("cargar_diagnostico")),
):
    consolidated = await get_resultados_consolidados(db, periodo)
    excel_bytes = generate_excel_resultados(consolidated, periodo)
    filename = f"diagnostico_{periodo}.xlsx"
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/buscar-alumno",
    summary="Buscar alumnos existentes por nombre, email, cuenta o folio",
    response_model=list[BuscarAlumnoResult],
)
async def buscar_alumno(
    db: DbSession,
    q: str = Query(..., min_length=1),
    _current_user: User = Depends(require_permission("cargar_diagnostico")),
):
    repo = DiagnosticoRepository(db)
    return await repo.buscar_alumno(q)


@router.post(
    "/crear-alumno",
    summary="Crear un alumno nuevo rápido desde diagnóstico",
)
async def crear_alumno(
    db: DbSession,
    payload: CrearAlumnoDiagnostico,
    _current_user: User = Depends(require_permission("cargar_diagnostico")),
):
    repo = DiagnosticoRepository(db)
    try:
        alumno = await repo.crear_alumno_rapido(
            nombre=payload.nombre,
            apellido_paterno=payload.apellido_paterno,
            apellido_materno=payload.apellido_materno,
            correo_personal=payload.correo_personal,
            numero_cuenta=payload.numero_cuenta,
            numero_folio=payload.numero_folio,
            ingenieria_clave=payload.ingenieria_clave,
            periodo=payload.periodo,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    await db.commit()
    return alumno
