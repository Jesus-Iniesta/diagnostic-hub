from fastapi import APIRouter, Depends

from app.api.deps import DbSession
from app.core.security import require_permission
from app.models.user import User
from app.repositories.configuracion_repository import (
    ConfiguracionRepository,
    CONTACTO_HABILITADO_KEY,
    REGISTRO_HABILITADO_KEY,
)
from app.schemas.configuracion import (
    ConfigContactoRead,
    ConfigContactoUpdate,
    ConfigRegistroRead,
    ConfigRegistroUpdate,
)

router = APIRouter()


@router.get(
    "/registro",
    response_model=ConfigRegistroRead,
    summary="Estado de apertura del formulario de registro",
)
async def read_registro_config(db: DbSession) -> ConfigRegistroRead:
    repo = ConfiguracionRepository(db)
    return ConfigRegistroRead(habilitado=await repo.is_registro_habilitado())


@router.put(
    "/registro",
    response_model=ConfigRegistroRead,
    summary="Habilitar o deshabilitar el formulario de registro",
)
async def update_registro_config(
    payload: ConfigRegistroUpdate,
    db: DbSession,
    _current_user: User = Depends(require_permission("gestionar_registro")),
) -> ConfigRegistroRead:
    repo = ConfiguracionRepository(db)
    await repo.set(REGISTRO_HABILITADO_KEY, "true" if payload.habilitado else "false")
    return ConfigRegistroRead(habilitado=payload.habilitado)


@router.get(
    "/contacto",
    response_model=ConfigContactoRead,
    summary="Estado de apertura del formulario de datos de contacto",
)
async def read_contacto_config(db: DbSession) -> ConfigContactoRead:
    repo = ConfiguracionRepository(db)
    return ConfigContactoRead(habilitado=await repo.is_contacto_habilitado())


@router.put(
    "/contacto",
    response_model=ConfigContactoRead,
    summary="Habilitar o deshabilitar el formulario de datos de contacto",
)
async def update_contacto_config(
    payload: ConfigContactoUpdate,
    db: DbSession,
    _current_user: User = Depends(require_permission("gestionar_registro")),
) -> ConfigContactoRead:
    repo = ConfiguracionRepository(db)
    await repo.set(CONTACTO_HABILITADO_KEY, "true" if payload.habilitado else "false")
    return ConfigContactoRead(habilitado=payload.habilitado)