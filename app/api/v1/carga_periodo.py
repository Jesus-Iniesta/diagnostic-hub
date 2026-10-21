from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel

from app.api.deps import DbSession
from app.core.security import require_permission
from app.models.user import User
from app.services.carga_periodo_service import (
    CargaPeriodoError,
    corregir_archivo,
    estado_periodo,
    guardar_archivo,
    juntar_repetidos,
    listar_archivos,
    procesar_archivo,
)
from app.services.alumnos_admin_service import revision_periodo
from app.services.excel_utils import ArchivoExcelError

router = APIRouter()


class ProcesarArchivoPayload(BaseModel):
    periodo: str
    examen: str


class JuntarPayload(BaseModel):
    periodo: str


class Correccion(BaseModel):
    indice: int
    alumno_id: int


class CorregirArchivoPayload(BaseModel):
    periodo: str
    examen: str
    correcciones: list[Correccion]


@router.get("/estado", summary="Avance del periodo (archivos, procesado, por revisar, CREANI)")
async def get_estado(
    db: DbSession,
    periodo: str = Query(...),
    _current_user: User = Depends(require_permission("cargar_diagnostico")),
):
    try:
        return await estado_periodo(db, periodo)
    except CargaPeriodoError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/revision", summary="Recuadros al terminar Procesar todo (alumnos y por revisar)")
async def get_revision(
    db: DbSession,
    periodo: str = Query(...),
    _current_user: User = Depends(require_permission("cargar_diagnostico")),
):
    if not periodo.strip():
        raise HTTPException(status_code=400, detail="Indica el periodo.")
    return await revision_periodo(db, periodo)


@router.post("/corregir", summary="Asignar a mano filas de un archivo guardado")
async def post_corregir(
    db: DbSession,
    payload: CorregirArchivoPayload,
    _current_user: User = Depends(require_permission("cargar_diagnostico")),
):
    try:
        return await corregir_archivo(
            db, payload.periodo, payload.examen, [c.model_dump() for c in payload.correcciones]
        )
    except (CargaPeriodoError, ArchivoExcelError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/archivos", summary="Archivos guardados del periodo")
async def get_archivos(
    db: DbSession,
    periodo: str = Query(...),
    _current_user: User = Depends(require_permission("cargar_diagnostico")),
):
    try:
        return await listar_archivos(db, periodo)
    except CargaPeriodoError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/archivos", summary="Guardar (sin procesar) el archivo de un examen")
async def post_archivo(
    db: DbSession,
    periodo: str = Form(...),
    examen: str = Form(...),
    file: UploadFile = File(...),
    _current_user: User = Depends(require_permission("cargar_diagnostico")),
):
    nombre = file.filename or ""
    if nombre.rsplit(".", 1)[-1].lower() not in ("xlsx", "xls"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos .xlsx o .xls")
    contenido = await file.read()
    if not contenido:
        raise HTTPException(status_code=400, detail="El archivo está vacío")
    try:
        return await guardar_archivo(db, periodo, examen, nombre, contenido)
    except CargaPeriodoError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/procesar", summary="Procesar un archivo guardado")
async def post_procesar(
    db: DbSession,
    payload: ProcesarArchivoPayload,
    _current_user: User = Depends(require_permission("cargar_diagnostico")),
):
    try:
        return await procesar_archivo(db, payload.periodo, payload.examen)
    except (CargaPeriodoError, ArchivoExcelError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error al procesar: {exc}")


@router.post(
    "/juntar",
    summary="Segunda vuelta: juntar alumnos registrados dos veces",
)
async def post_juntar(
    db: DbSession,
    payload: JuntarPayload,
    _current_user: User = Depends(require_permission("cargar_diagnostico")),
):
    try:
        return await juntar_repetidos(db, payload.periodo)
    except (CargaPeriodoError, ArchivoExcelError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))
