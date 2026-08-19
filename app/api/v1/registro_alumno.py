from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import DbSession
from app.core.security import get_current_user
from app.models.user import User
from app.repositories.configuracion_repository import ConfiguracionRepository
from app.repositories.registro_alumno_repository import RegistroAlumnoRepository
from app.schemas.alumno import AlumnoRead
from app.schemas.registro_alumno import RegistroAlumnoCreate, RegistroAlumnoUpdate

router = APIRouter()


@router.post(
    "/registro",
    response_model=AlumnoRead,
    status_code=201,
    summary="Registrar un alumno (formulario de autoservicio)",
)
async def registrar_alumno(
    payload: RegistroAlumnoCreate,
    db: DbSession,
) -> AlumnoRead:
    config = ConfiguracionRepository(db)
    if not await config.is_registro_habilitado():
        raise HTTPException(
            status_code=403,
            detail="El formulario de registro está cerrado",
        )

    repo = RegistroAlumnoRepository(db)
    alumno = await repo.create(payload)
    return AlumnoRead.model_validate(alumno)


@router.get(
    "/me",
    response_model=AlumnoRead,
    summary="Perfil de alumno del usuario autenticado",
)
async def leer_mi_registro(
    db: DbSession,
    current_user: User = Depends(get_current_user),
) -> AlumnoRead:
    repo = RegistroAlumnoRepository(db)
    alumno = await repo.get_by_user_id(current_user.id)
    if not alumno:
        raise HTTPException(status_code=404, detail="No hay un perfil de alumno")
    return AlumnoRead.model_validate(alumno)


@router.put(
    "/me",
    response_model=AlumnoRead,
    summary="Actualizar el formulario de registro del alumno autenticado",
)
async def actualizar_mi_registro(
    payload: RegistroAlumnoUpdate,
    db: DbSession,
    current_user: User = Depends(get_current_user),
) -> AlumnoRead:
    repo = RegistroAlumnoRepository(db)
    alumno = await repo.get_by_user_id(current_user.id)
    if not alumno:
        raise HTTPException(status_code=404, detail="No hay un perfil de alumno")
    updated = await repo.update(alumno, payload)
    return AlumnoRead.model_validate(updated)