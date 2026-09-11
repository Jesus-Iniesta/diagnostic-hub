from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.resultado_webassign import ResultadoWebAssign


class WebAssignRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def upsert_resultado(
        self,
        alumno_id: int,
        periodo: str,
        carrera: str,
        algebra_trabajo: float | None,
        algebra_examen: float | None,
        trigonometria_trabajo: float | None,
        trigonometria_examen: float | None,
        geometria_trabajo: float | None,
        geometria_examen: float | None,
    ) -> None:
        existing = await self.db.execute(
            select(ResultadoWebAssign).where(
                ResultadoWebAssign.alumno_id == alumno_id,
                ResultadoWebAssign.periodo == periodo,
            )
        )
        row = existing.scalars().first()
        if not row:
            row = ResultadoWebAssign(
                alumno_id=alumno_id,
                periodo=periodo,
                carrera=carrera,
            )
            self.db.add(row)
        else:
            row.carrera = carrera

        row.algebra_trabajo = algebra_trabajo
        row.algebra_examen = algebra_examen
        row.trigonometria_trabajo = trigonometria_trabajo
        row.trigonometria_examen = trigonometria_examen
        row.geometria_trabajo = geometria_trabajo
        row.geometria_examen = geometria_examen

    async def get_resultado(
        self, alumno_id: int, periodo: str
    ) -> ResultadoWebAssign | None:
        result = await self.db.execute(
            select(ResultadoWebAssign).where(
                ResultadoWebAssign.alumno_id == alumno_id,
                ResultadoWebAssign.periodo == periodo,
            )
        )
        return result.scalars().first()

    async def get_resultados_by_periodo(
        self, periodo: str,
    ) -> list[ResultadoWebAssign]:
        result = await self.db.execute(
            select(ResultadoWebAssign).where(
                ResultadoWebAssign.periodo == periodo
            )
        )
        return list(result.scalars().all())

    async def get_status(self, periodo: str) -> dict:
        total = (await self.db.execute(
            select(func.count()).select_from(ResultadoWebAssign).where(
                ResultadoWebAssign.periodo == periodo
            )
        )).scalar_one()

        carreras = (await self.db.execute(
            select(
                ResultadoWebAssign.carrera,
                func.count(),
            )
            .where(ResultadoWebAssign.periodo == periodo)
            .group_by(ResultadoWebAssign.carrera)
        )).all()

        return {
            "total_registros": total,
            "por_carrera": [
                {"carrera": c, "total_alumnos": n} for c, n in carreras
            ],
        }
