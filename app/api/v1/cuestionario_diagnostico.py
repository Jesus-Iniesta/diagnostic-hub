from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.deps import DbSession
from app.core.security import require_permission
from app.models.user import User
from app.services.upload_cuestionario_service import (
    corregir_matching_cuestionario,
    procesar_cuestionario,
)

router = APIRouter()


def _validar_cuestionario(cuestionario: int) -> None:
    if cuestionario not in (1, 2):
        raise HTTPException(
            status_code=400,
            detail=f"Cuestionario no válido: {cuestionario} (solo 1 o 2)",
        )


def _validar_archivo_ext(file: UploadFile) -> None:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No se proporcionó un archivo")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ("xlsx", "xls"):
        raise HTTPException(
            status_code=400, detail="Solo se permiten archivos .xlsx o .xls"
        )


@router.post(
    "/upload",
    summary="Subir un cuestionario diagnóstico (1 o 2)",
)
async def upload_cuestionario(
    db: DbSession,
    cuestionario: int = Form(...),
    periodo: str = Form(...),
    _current_user: User = Depends(require_permission("cargar_diagnostico")),
    file: UploadFile = File(...),
):
    _validar_cuestionario(cuestionario)
    _validar_archivo_ext(file)
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="El archivo está vacío")
    try:
        return await procesar_cuestionario(db, content, cuestionario, periodo)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al procesar: {exc}")


@router.post(
    "/corregir-matching",
    summary="Corregir matching de alumnos no encontrados en un cuestionario",
)
async def corregir_matching(
    db: DbSession,
    cuestionario: int = Form(...),
    periodo: str = Form(...),
    correcciones_json: str = Form(...),
    _current_user: User = Depends(require_permission("cargar_diagnostico")),
    file: UploadFile = File(...),
):
    import json as _json

    _validar_cuestionario(cuestionario)
    _validar_archivo_ext(file)
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="El archivo está vacío")

    try:
        correcciones = _json.loads(correcciones_json)
        if not isinstance(correcciones, list) or any(
            "indice" not in c or "alumno_id" not in c for c in correcciones
        ):
            raise ValueError("correcciones debe ser una lista de {indice, alumno_id}")
    except Exception:
        raise HTTPException(status_code=400, detail="Payload inválido")

    try:
        return await corregir_matching_cuestionario(
            db,
            file_bytes=content,
            cuestionario=cuestionario,
            periodo=periodo,
            correcciones=correcciones,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al corregir: {exc}")
