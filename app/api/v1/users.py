from fastapi import APIRouter, Depends, Query

from app.api.deps import DbSession
from app.core.security import require_permission
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserListResponse, UserRead

router = APIRouter()


@router.get(
    "",
    response_model=UserListResponse,
    summary="Listar usuarios con filtros y paginación",
)
async def list_users(
    db: DbSession,
    role_name: str | None = Query(default=None, description="Filtrar por nombre de rol"),
    busqueda: str | None = Query(default=None, description="Buscar por nombre, apellido o correo"),
    activo: bool | None = Query(default=None, description="Filtrar por estado activo"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _current_user: User = Depends(require_permission("consultar_usuarios")),
):
    repo = UserRepository(db)
    items, total = await repo.list(
        role_name=role_name,
        busqueda=busqueda,
        activo=activo,
        limit=limit,
        offset=offset,
    )
    return UserListResponse(
        items=[UserRead.model_validate(u) for u in items],
        total=total,
        limit=limit,
        offset=offset,
    )
