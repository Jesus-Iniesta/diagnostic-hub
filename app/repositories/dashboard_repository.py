from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alumno import Alumno
from app.models.ingenieria import Ingenieria
from app.models.resultado_diagnostico import ResultadoDiagnostico

_LEVEL_ORDER = ["Alto", "Bueno", "Medio", "Bajo", "Muy bajo"]


def _level_case():
    return case(
        (
            ResultadoDiagnostico.promedio_diagnostico >= 9,
            "Alto",
        ),
        (
            ResultadoDiagnostico.promedio_diagnostico >= 7,
            "Bueno",
        ),
        (
            ResultadoDiagnostico.promedio_diagnostico >= 4.5,
            "Medio",
        ),
        (
            ResultadoDiagnostico.promedio_diagnostico >= 2.5,
            "Bajo",
        ),
        else_="Muy bajo",
    )


class DashboardRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_stats(
        self, periodo: str, ingenieria_clave: str | None = None
    ) -> dict:
        alumnos_total = (
            await self.db.execute(select(func.count()).select_from(Alumno))
        ).scalar_one()

        programas_activos = (
            await self.db.execute(
                select(func.count())
                .select_from(Ingenieria)
                .where(Ingenieria.activo.is_(True))
            )
        ).scalar_one()

        evaluaciones_diagnostico = (
            await self.db.execute(
                select(func.count())
                .select_from(ResultadoDiagnostico)
                .where(ResultadoDiagnostico.periodo == periodo)
            )
        ).scalar_one()

        periodos_con_datos = (
            await self.db.execute(
                select(
                    func.count(func.distinct(ResultadoDiagnostico.periodo))
                )
            )
        ).scalar_one()

        level_distribution = await self._get_level_distribution(
            periodo, ingenieria_clave, evaluaciones_diagnostico
        )

        quick_summary = await self._get_quick_summary(
            periodo, alumnos_total, evaluaciones_diagnostico
        )

        return {
            "alumnos_total": alumnos_total,
            "programas_activos": programas_activos,
            "evaluaciones_diagnostico": evaluaciones_diagnostico,
            "periodos_con_datos": periodos_con_datos,
            "level_distribution": level_distribution,
            "quick_summary": quick_summary,
        }

    async def _get_level_distribution(
        self,
        periodo: str,
        ingenieria_clave: str | None,
        total: int,
    ) -> list[dict]:
        nivel_col = _level_case().label("nivel")

        stmt = (
            select(nivel_col, func.count().label("cantidad"))
            .where(
                ResultadoDiagnostico.periodo == periodo,
                ResultadoDiagnostico.promedio_diagnostico.isnot(None),
            )
            .group_by(nivel_col)
        )

        if ingenieria_clave:
            stmt = stmt.join(
                Alumno,
                Alumno.id == ResultadoDiagnostico.alumno_id,
            ).join(
                Ingenieria,
                (Ingenieria.id == Alumno.ingenieria_id)
                & (Ingenieria.clave == ingenieria_clave),
            )

        rows = (await self.db.execute(stmt)).all()

        counts = {row.nivel: row.cantidad for row in rows}

        distribution = []
        for nivel in _LEVEL_ORDER:
            cantidad = counts.get(nivel, 0)
            porcentaje = round(cantidad / total * 100, 1) if total else 0.0
            distribution.append(
                {"nivel": nivel, "cantidad": cantidad, "porcentaje": porcentaje}
            )

        return distribution

    async def _get_quick_summary(
        self,
        periodo: str,
        alumnos_total: int,
        procesados: int,
    ) -> dict:
        ultimo_procesamiento = (
            await self.db.execute(
                select(func.max(ResultadoDiagnostico.updated_at)).where(
                    ResultadoDiagnostico.periodo == periodo
                )
            )
        ).scalar_one()

        pendientes = max(alumnos_total - procesados, 0)
        porcentaje = (
            round(procesados / alumnos_total * 100, 1) if alumnos_total else 0.0
        )

        return {
            "ultimo_procesamiento": (
                ultimo_procesamiento.isoformat()
                if ultimo_procesamiento
                else None
            ),
            "alumnos_procesados": procesados,
            "alumnos_pendientes": pendientes,
            "porcentaje_procesado": porcentaje,
        }
