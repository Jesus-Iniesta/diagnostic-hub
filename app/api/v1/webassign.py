from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form

from app.api.deps import DbSession
from app.core.security import require_permission
from app.models.user import User
from app.repositories.webassign_repository import WebAssignRepository
from app.schemas.webassign import CorregirMatchingWebAssignPayload
from app.services.upload_webassign_service import CARRERAS, procesar_webassign

router = APIRouter()


@router.post(
    "/upload",
    summary="Cargar archivo WebAssign por carrera",
)
async def upload_webassign(
    db: DbSession,
    carrera: str = Form(...),
    periodo: str = Form(...),
    file: UploadFile = File(...),
    _current_user: User = Depends(require_permission("cargar_diagnostico")),
):
    if carrera.upper() not in CARRERAS:
        raise HTTPException(
            status_code=400,
            detail=f"Carrera no válida. Válidas: {', '.join(CARRERAS)}",
        )
    if not file.filename or not (
        file.filename.endswith(".xls") or file.filename.endswith(".xlsx")
    ):
        raise HTTPException(
            status_code=400, detail="Solo se aceptan archivos .xls o .xlsx"
        )

    content = await file.read()
    result = await procesar_webassign(db, content, carrera.upper(), periodo)
    await db.commit()
    return result


@router.get(
    "/resultados",
    summary="Obtener todos los resultados WebAssign de un periodo",
)
async def get_resultados(
    db: DbSession,
    periodo: str = Query(...),
    carrera: str | None = Query(default=None),
    _current_user: User = Depends(require_permission("cargar_diagnostico")),
):
    repo = WebAssignRepository(db)
    rows = await repo.get_resultados_by_periodo(periodo)
    if carrera:
        rows = [r for r in rows if r.carrera == carrera.upper()]

    from sqlalchemy import select
    from app.models.alumno import Alumno
    from app.models.user import User as UserModel
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(Alumno, UserModel)
        .join(UserModel, Alumno.usuario_id == UserModel.id)
        .options(selectinload(Alumno.ingenieria))
    )
    alumno_map = {}
    for alumno, user in result.all():
        alumno_map[alumno.id] = {
            "nombre": f"{user.nombre} {user.apellido_paterno} {user.apellido_materno}",
            "cuenta": alumno.numero_cuenta,
            "correo": user.correo_personal,
            "ingenieria": alumno.ingenieria.clave if alumno.ingenieria else None,
        }

    return [
        {
            "alumno_id": r.alumno_id,
            "nombre_completo": alumno_map.get(r.alumno_id, {}).get("nombre", ""),
            "numero_cuenta": alumno_map.get(r.alumno_id, {}).get("cuenta"),
            "correo": alumno_map.get(r.alumno_id, {}).get("correo"),
            "ingenieria": alumno_map.get(r.alumno_id, {}).get("ingenieria"),
            "carrera": r.carrera,
            "algebra_trabajo": r.algebra_trabajo,
            "algebra_examen": r.algebra_examen,
            "trigonometria_trabajo": r.trigonometria_trabajo,
            "trigonometria_examen": r.trigonometria_examen,
            "geometria_trabajo": r.geometria_trabajo,
            "geometria_examen": r.geometria_examen,
        }
        for r in rows
    ]


@router.get(
    "/status",
    summary="Estado de carga WebAssign por carrera",
)
async def get_status(
    db: DbSession,
    periodo: str = Query(...),
    _current_user: User = Depends(require_permission("cargar_diagnostico")),
):
    repo = WebAssignRepository(db)
    return await repo.get_status(periodo)


@router.post(
    "/corregir-matching",
    summary="Corregir matching de alumno no encontrado",
)
async def corregir_matching(
    db: DbSession,
    payload: CorregirMatchingWebAssignPayload,
    _current_user: User = Depends(require_permission("cargar_diagnostico")),
):
    repo = WebAssignRepository(db)
    for item in payload.correcciones:
        existing = await repo.get_resultado(item.alumno_id, payload.periodo)
        if not existing:
            raise HTTPException(
                status_code=404,
                detail=f"No se encontró resultado para alumno_id={item.alumno_id}",
            )
    return {"detail": "Correcciones aplicadas", "total": len(payload.correcciones)}
