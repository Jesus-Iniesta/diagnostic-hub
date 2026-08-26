from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.deps import DbSession
from app.core.security import require_permission
from app.models.user import User
from app.schemas.upload import (
    CampoError,
    CorreccionUpload,
    FilaResultadoResponse,
    ResultadoCargaResponse,
)
from app.services.upload_alumnos_service import (
    ResultadoCarga,
    procesar_correcciones,
    procesar_excel,
)

router = APIRouter()


def _build_response(resultado: ResultadoCarga) -> ResultadoCargaResponse:
    return ResultadoCargaResponse(
        total_filas=resultado.total_filas,
        exitosos=resultado.exitosos,
        duplicados=resultado.duplicados,
        errores=resultado.errores,
        detalle=[
            FilaResultadoResponse(
                fila=d.fila,
                nombre_completo=d.nombre_completo,
                numero_cuenta=d.numero_cuenta,
                estado=d.estado,
                motivo=d.motivo,
                campos_con_error=[CampoError(**c) for c in d.campos_con_error],
                datos_originales=d.datos_originales,
            )
            for d in resultado.detalle
        ],
    )


@router.post(
    "/upload",
    response_model=ResultadoCargaResponse,
    summary="Subir archivo Excel para crear alumnos masivamente",
)
async def upload_alumnos(
    db: DbSession,
    _current_user: User = Depends(require_permission("cargar_excel")),
    file: UploadFile = File(...),
) -> ResultadoCargaResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No se proporcionó un archivo")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ("xlsx", "xls"):
        raise HTTPException(
            status_code=400,
            detail="Solo se permiten archivos .xlsx o .xls",
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="El archivo está vacío")

    try:
        resultado: ResultadoCarga = await procesar_excel(db, content)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al procesar el archivo: {exc}",
        )

    return _build_response(resultado)


@router.post(
    "/upload/corregir",
    response_model=ResultadoCargaResponse,
    summary="Reenviar filas corregidas del Excel",
)
async def corregir_filas(
    payload: CorreccionUpload,
    db: DbSession,
    _current_user: User = Depends(require_permission("cargar_excel")),
) -> ResultadoCargaResponse:
    if not payload.filas:
        raise HTTPException(status_code=400, detail="No se proporcionaron filas para corregir")

    try:
        resultado: ResultadoCarga = await procesar_correcciones(
            db, [f.model_dump() for f in payload.filas]
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al procesar correcciones: {exc}",
        )

    return _build_response(resultado)
