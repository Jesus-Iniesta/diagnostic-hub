from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.alumno import Alumno
from app.models.ingenieria import Ingenieria
from app.models.role import Role
from app.models.user import User


class AlumnoRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list(
        self,
        periodo_ingreso: str | None = None,
        ingenieria_clave: str | None = None,
        numero_cuenta: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Alumno], int]:
        conditions = []
        if periodo_ingreso:
            conditions.append(Alumno.periodo_ingreso == periodo_ingreso)
        if ingenieria_clave:
            conditions.append(Ingenieria.clave == ingenieria_clave)
        if numero_cuenta:
            conditions.append(
                or_(
                    Alumno.numero_cuenta == numero_cuenta,
                    Alumno.numero_folio == numero_cuenta,
                )
            )

        query = select(Alumno)
        if ingenieria_clave:
            query = query.join(Ingenieria, Alumno.ingenieria_id == Ingenieria.id)

        result = await self.db.execute(
            query.where(*conditions)
            .options(
                selectinload(Alumno.usuario)
                .selectinload(User.role)
                .selectinload(Role.permissions),
                selectinload(Alumno.ingenieria),
            )
            .order_by(Alumno.id)
            .offset(offset)
            .limit(limit)
        )
        items = list(result.scalars().unique().all())

        count_query = select(func.count()).select_from(Alumno)
        if ingenieria_clave:
            count_query = count_query.join(
                Ingenieria, Alumno.ingenieria_id == Ingenieria.id
            )
        count_query = count_query.where(*conditions)
        total = (await self.db.execute(count_query)).scalar_one()

        return items, total