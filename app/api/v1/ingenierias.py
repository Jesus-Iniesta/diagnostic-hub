from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import DbSession
from app.models.ingenieria import Ingenieria
from app.schemas.ingenieria import IngenieriaRead

router = APIRouter()


@router.get(
    "",
    response_model=list[IngenieriaRead],
    summary="Listar el catálogo de ingenierías activas",
)
async def list_ingenierias(db: DbSession) -> list[IngenieriaRead]:
    result = await db.execute(
        select(Ingenieria)
        .where(Ingenieria.activo == True)  # noqa: E712
        .order_by(Ingenieria.nombre)
    )
    return [IngenieriaRead.model_validate(item) for item in result.scalars()]