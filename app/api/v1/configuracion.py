from fastapi import APIRouter, Depends, HTTPException, Query

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
    PeriodoRangoRead,
    PeriodoRangoUpdate,
)
from app.services.upload_diagnostico_service import (
    normalizar_periodo,
    obtener_rango_periodo,
)

PERIODO_INVALIDO_MSG = (
    "El periodo debe tener el formato AAAA A o AAAA B (ej. 2026B)."
)

PERIODO_RANGO_KEY_PREFIX = "periodo_rango:"

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


@router.get(
    "/periodo-rango",
    response_model=PeriodoRangoRead,
    summary="Rango de fechas de un periodo (A/B)",
)
async def read_periodo_rango(
    db: DbSession,
    periodo: str = Query(..., description="Ejemplo: 2026B"),
) -> PeriodoRangoRead:
    rango = await obtener_rango_periodo(db, periodo)
    if rango is None:
        raise HTTPException(status_code=400, detail=PERIODO_INVALIDO_MSG)
    inicio, fin, es_default = rango
    return PeriodoRangoRead(
        periodo=normalizar_periodo(periodo),
        inicio=inicio,
        fin=fin,
        es_default=es_default,
    )


@router.put(
    "/periodo-rango",
    response_model=PeriodoRangoRead,
    summary="Configurar el rango de fechas de un periodo (A/B)",
)
async def update_periodo_rango(
    payload: PeriodoRangoUpdate,
    db: DbSession,
    _current_user: User = Depends(require_permission("gestionar_registro")),
) -> PeriodoRangoRead:
    normalizado = normalizar_periodo(payload.periodo)
    if normalizado is None:
        raise HTTPException(status_code=400, detail=PERIODO_INVALIDO_MSG)
    if payload.inicio > payload.fin:
        raise HTTPException(
            status_code=400,
            detail="La fecha de inicio debe ser anterior o igual a la de fin.",
        )
    repo = ConfiguracionRepository(db)
    await repo.set(
        f"{PERIODO_RANGO_KEY_PREFIX}{normalizado}",
        f"{payload.inicio.isoformat()}|{payload.fin.isoformat()}",
    )
    return PeriodoRangoRead(
        periodo=normalizado,
        inicio=payload.inicio,
        fin=payload.fin,
        es_default=False,
    )