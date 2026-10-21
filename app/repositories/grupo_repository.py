from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.alumno import Alumno
from app.models.grupo import Grupo
from app.models.grupo_alumno import grupo_alumno
from app.models.grupo_profesor import grupo_profesor
from app.models.resultado_diagnostico import ResultadoDiagnostico
from app.services.upload_diagnostico_service import normalizar_periodo


def nombre_propio(*partes: str | None) -> str:
    """'FANNY', 'HERNÁNDEZ', 'LÓPEZ' -> 'Fanny Hernández López'."""
    palabras = " ".join(p for p in partes if p).split()
    return " ".join(w.capitalize() for w in palabras)


def _orden_reciente(resultado: ResultadoDiagnostico) -> tuple:
    """Orden para elegir el examen final más reciente: por periodo (2026B >
    2026A > 2025B) y, si empatan o no tienen formato, por última actualización."""
    return (normalizar_periodo(resultado.periodo) or "", resultado.updated_at)


class GrupoRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_by_profesor(
        self, user_id: int, periodo: str | None = None
    ) -> list[Grupo]:
        stmt = (
            select(Grupo)
            .join(grupo_profesor, grupo_profesor.c.grupo_id == Grupo.id)
            .where(
                grupo_profesor.c.user_id == user_id,
                Grupo.activo,
            )
            .options(selectinload(Grupo.materia))
        )
        if periodo:
            stmt = stmt.where(Grupo.periodo == periodo)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get(self, grupo_id: int) -> Grupo | None:
        result = await self.db.execute(
            select(Grupo)
            .where(Grupo.id == grupo_id)
            .options(
                selectinload(Grupo.materia),
                selectinload(Grupo.alumnos).selectinload(Alumno.usuario),
                selectinload(Grupo.alumnos).selectinload(Alumno.ingenieria),
            )
        )
        return result.scalars().first()

    async def is_profesor_of_grupo(self, user_id: int, grupo_id: int) -> bool:
        result = await self.db.execute(
            select(grupo_profesor).where(
                grupo_profesor.c.user_id == user_id,
                grupo_profesor.c.grupo_id == grupo_id,
            )
        )
        return result.first() is not None

    async def create(
        self, nombre: str, materia_id: int, periodo: str, profesor_user_id: int,
        nombre_archivo: str | None = None,
    ) -> Grupo:
        grupo = Grupo(
            nombre=nombre,
            materia_id=materia_id,
            periodo=periodo,
            nombre_archivo=nombre_archivo,
        )
        self.db.add(grupo)
        await self.db.flush()

        await self.db.execute(
            grupo_profesor.insert().values(
                grupo_id=grupo.id, user_id=profesor_user_id
            )
        )
        await self.db.flush()

        return grupo

    async def delete(self, grupo_id: int) -> None:
        grupo = await self.db.get(Grupo, grupo_id)
        if grupo:
            grupo.activo = False
            grupo.updated_at = datetime.now()
            await self.db.flush()

    async def get_alumnos(self, grupo_id: int) -> list[Alumno]:
        result = await self.db.execute(
            select(Alumno)
            .join(grupo_alumno, grupo_alumno.c.alumno_id == Alumno.id)
            .where(grupo_alumno.c.grupo_id == grupo_id)
            .options(
                selectinload(Alumno.usuario),
                selectinload(Alumno.ingenieria),
            )
        )
        return list(result.scalars().all())

    async def add_alumno(self, grupo_id: int, alumno_id: int, periodo: str) -> bool:
        exists = await self.db.execute(
            select(grupo_alumno).where(
                grupo_alumno.c.grupo_id == grupo_id,
                grupo_alumno.c.alumno_id == alumno_id,
                grupo_alumno.c.periodo == periodo,
            )
        )
        if exists.first():
            return False

        await self.db.execute(
            grupo_alumno.insert().values(
                grupo_id=grupo_id,
                alumno_id=alumno_id,
                periodo=periodo,
            )
        )
        await self.db.flush()
        return True

    async def remove_alumno(self, grupo_id: int, alumno_id: int) -> bool:
        result = await self.db.execute(
            grupo_alumno.delete().where(
                grupo_alumno.c.grupo_id == grupo_id,
                grupo_alumno.c.alumno_id == alumno_id,
            )
        )
        await self.db.flush()
        return result.rowcount > 0

    async def resultados_examen_final(
        self, alumno_ids: list[int], periodo: str | None = None
    ) -> dict[int, ResultadoDiagnostico]:
        """Examen final de cada alumno: el del periodo indicado o, sin periodo,
        el más reciente que tenga."""
        if not alumno_ids:
            return {}
        stmt = select(ResultadoDiagnostico).where(
            ResultadoDiagnostico.alumno_id.in_(alumno_ids)
        )
        if periodo:
            stmt = stmt.where(ResultadoDiagnostico.periodo == periodo)
        por_alumno: dict[int, ResultadoDiagnostico] = {}
        for r in (await self.db.execute(stmt)).scalars().all():
            previo = por_alumno.get(r.alumno_id)
            if previo is None or _orden_reciente(r) > _orden_reciente(previo):
                por_alumno[r.alumno_id] = r
        return por_alumno

    async def get_resumen(
        self, grupo_id: int, periodo: str | None = None
    ) -> dict:
        grupo = await self.db.get(Grupo, grupo_id)
        nombre = grupo.nombre if grupo else ""
        alumnos = await self.get_alumnos(grupo_id)
        total = len(alumnos)

        if total == 0:
            return {
                "grupo_id": grupo_id,
                "nombre": "",
                "total_alumnos": 0,
                "evaluados": 0,
                "promedio": None,
                "alumnos_con_resultados": 0,
            }

        diagnostico_map = await self.resultados_examen_final(
            [a.id for a in alumnos], periodo
        )

        evaluados = 0
        suma = 0.0
        con_resultados = 0

        for alumno in alumnos:
            diag = diagnostico_map.get(alumno.id)
            if diag and diag.promedio_diagnostico is not None:
                evaluados += 1
                suma += diag.promedio_diagnostico
                con_resultados += 1

        promedio = round(suma / evaluados, 2) if evaluados > 0 else None

        return {
            "grupo_id": grupo_id,
            "nombre": nombre,
            "total_alumnos": total,
            "evaluados": evaluados,
            "promedio": promedio,
            "alumnos_con_resultados": con_resultados,
        }

    async def count_alumnos(self, grupo_id: int) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(grupo_alumno).where(
                grupo_alumno.c.grupo_id == grupo_id
            )
        )
        return result.scalar_one()

    async def find_alumno_by_cuenta(self, numero_cuenta: str) -> Alumno | None:
        result = await self.db.execute(
            select(Alumno)
            .where(Alumno.numero_cuenta == numero_cuenta)
            .options(
                selectinload(Alumno.usuario),
                selectinload(Alumno.ingenieria),
            )
        )
        return result.scalars().first()
