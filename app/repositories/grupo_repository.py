from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.alumno import Alumno
from app.models.grupo import Grupo
from app.models.grupo_alumno import grupo_alumno
from app.models.grupo_profesor import grupo_profesor
from app.models.resultado_diagnostico import ResultadoDiagnostico


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

    async def get_resumen(
        self, grupo_id: int, periodo: str
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

        alumno_ids = [a.id for a in alumnos]

        result = await self.db.execute(
            select(ResultadoDiagnostico).where(
                ResultadoDiagnostico.alumno_id.in_(alumno_ids),
                ResultadoDiagnostico.periodo == periodo,
            )
        )
        diagnosticos = result.scalars().all()
        diagnostico_map = {d.alumno_id: d for d in diagnosticos}

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

    async def get_grupo_alumno_with_diagnostico(
        self, grupo_id: int, periodo: str
    ) -> list[dict]:
        alumnos = await self.get_alumnos(grupo_id)
        alumno_ids = [a.id for a in alumnos]

        result = await self.db.execute(
            select(ResultadoDiagnostico).where(
                ResultadoDiagnostico.alumno_id.in_(alumno_ids),
                ResultadoDiagnostico.periodo == periodo,
            )
        )
        diagnostico_map = {d.alumno_id: d for d in result.scalars().all()}

        rows = []
        for alumno in alumnos:
            diag = diagnostico_map.get(alumno.id)
            rows.append({
                "alumno_id": alumno.id,
                "nombre": f"{alumno.usuario.nombre} {alumno.usuario.apellido_paterno} {alumno.usuario.apellido_materno}",
                "numero_cuenta": alumno.numero_cuenta or "",
                "ingenieria_clave": alumno.ingenieria.clave if alumno.ingenieria else "",
                "puntaje": diag.promedio_diagnostico if diag else None,
                "nivel": self._nivel(diag.promedio_diagnostico) if diag else None,
            })
        return rows

    @staticmethod
    def _nivel(score: float | None) -> str:
        if score is None:
            return "Sin resultado"
        if score >= 9:
            return "Alto"
        if score >= 7:
            return "Bueno"
        if score >= 4.5:
            return "Medio"
        if score >= 2.5:
            return "Bajo"
        return "Muy bajo"

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

    async def get_estadisticas_grupo(
        self, grupo_id: int, periodo: str
    ) -> dict:
        alumnos = await self.get_alumnos(grupo_id)
        alumno_ids = [a.id for a in alumnos]
        total = len(alumnos)

        if total == 0:
            return {
                "grupo_id": grupo_id,
                "nombre": "",
                "total_alumnos": 0,
                "evaluados": 0,
                "promedio": None,
                "distribucion_nivel": [],
                "distribucion_ingenieria": [],
                "promedio_materias": {
                    "algebra": None,
                    "trigonometria": None,
                    "geometria": None,
                    "calculo": None,
                },
            }

        # Fetch diagnostic results
        result = await self.db.execute(
            select(ResultadoDiagnostico).where(
                ResultadoDiagnostico.alumno_id.in_(alumno_ids),
                ResultadoDiagnostico.periodo == periodo,
            )
        )
        diagnosticos = result.scalars().all()
        diagnostico_map = {d.alumno_id: d for d in diagnosticos}

        # Compute level distribution
        nivel_counts: dict[str, int] = {}
        evaluados = 0
        suma = 0.0
        sum_algebra = 0.0
        sum_trig = 0.0
        sum_geo = 0.0
        sum_calc = 0.0
        count_algebra = 0
        count_trig = 0
        count_geo = 0
        count_calc = 0

        for alumno in alumnos:
            diag = diagnostico_map.get(alumno.id)
            if diag and diag.promedio_diagnostico is not None:
                evaluados += 1
                suma += diag.promedio_diagnostico
                nivel = self._nivel(diag.promedio_diagnostico)
                nivel_counts[nivel] = nivel_counts.get(nivel, 0) + 1

                if diag.puntaje_algebra is not None:
                    sum_algebra += diag.puntaje_algebra
                    count_algebra += 1
                if diag.puntaje_trigonometria is not None:
                    sum_trig += diag.puntaje_trigonometria
                    count_trig += 1
                if diag.puntaje_geometria is not None:
                    sum_geo += diag.puntaje_geometria
                    count_geo += 1
                if diag.puntaje_calculo is not None:
                    sum_calc += diag.puntaje_calculo
                    count_calc += 1

        promedio = round(suma / evaluados, 2) if evaluados > 0 else None

        nivel_orden = ["Alto", "Bueno", "Medio", "Bajo", "Muy bajo"]
        distribucion_nivel = []
        for nivel in nivel_orden:
            count = nivel_counts.get(nivel, 0)
            if count > 0:
                distribucion_nivel.append({
                    "nivel": nivel,
                    "cantidad": count,
                    "porcentaje": round(count / evaluados * 100, 1) if evaluados > 0 else 0,
                })

        # Engineering distribution
        ingenieria_counts: dict[str, int] = {}
        for alumno in alumnos:
            clave = alumno.ingenieria.clave if alumno.ingenieria else "Sin definir"
            ingenieria_counts[clave] = ingenieria_counts.get(clave, 0) + 1

        distribucion_ingenieria = [
            {"ingenieria": k, "cantidad": v}
            for k, v in sorted(ingenieria_counts.items(), key=lambda x: -x[1])
        ]

        promedio_materias = {
            "algebra": round(sum_algebra / count_algebra, 2) if count_algebra > 0 else None,
            "trigonometria": round(sum_trig / count_trig, 2) if count_trig > 0 else None,
            "geometria": round(sum_geo / count_geo, 2) if count_geo > 0 else None,
            "calculo": round(sum_calc / count_calc, 2) if count_calc > 0 else None,
        }

        return {
            "grupo_id": grupo_id,
            "nombre": "",
            "total_alumnos": total,
            "evaluados": evaluados,
            "promedio": promedio,
            "distribucion_nivel": distribucion_nivel,
            "distribucion_ingenieria": distribucion_ingenieria,
            "promedio_materias": promedio_materias,
        }
