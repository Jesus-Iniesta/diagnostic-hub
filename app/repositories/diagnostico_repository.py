import unicodedata

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.alumno import Alumno
from app.models.ingenieria import Ingenieria
from app.models.respuesta_correcta_diagnostico import RespuestaCorrectaDiagnostico
from app.models.resultado_diagnostico import ResultadoDiagnostico
from app.models.role import Role
from app.models.user import AuthMethod, User


class DiagnosticoRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_respuestas_correctas(
        self, materia: str, periodo: str
    ) -> dict[str, str]:
        result = await self.db.execute(
            select(RespuestaCorrectaDiagnostico).where(
                RespuestaCorrectaDiagnostico.materia == materia,
                RespuestaCorrectaDiagnostico.periodo == periodo,
            )
        )
        rows = result.scalars().all()
        return {r.codigo: r.respuesta_correcta for r in rows}

    async def upsert_respuesta_correcta(
        self,
        materia: str,
        codigo: str,
        respuesta: str,
        periodo: str,
    ) -> None:
        respuesta = respuesta.strip().lower()
        existing = await self.db.execute(
            select(RespuestaCorrectaDiagnostico).where(
                RespuestaCorrectaDiagnostico.materia == materia,
                RespuestaCorrectaDiagnostico.codigo == codigo,
                RespuestaCorrectaDiagnostico.periodo == periodo,
            )
        )
        row = existing.scalars().first()
        if row:
            row.respuesta_correcta = respuesta
        else:
            row = RespuestaCorrectaDiagnostico(
                materia=materia,
                codigo=codigo,
                respuesta_correcta=respuesta,
                periodo=periodo,
            )
            self.db.add(row)

    async def upsert_resultado(
        self,
        alumno_id: int,
        periodo: str,
        respuestas_json: str | None,
        materia: str,
        puntaje: float,
    ) -> None:
        existing = await self.db.execute(
            select(ResultadoDiagnostico).where(
                ResultadoDiagnostico.alumno_id == alumno_id,
                ResultadoDiagnostico.periodo == periodo,
            )
        )
        row = existing.scalars().first()
        if not row:
            row = ResultadoDiagnostico(
                alumno_id=alumno_id,
                periodo=periodo,
            )
            self.db.add(row)

        if materia == "algebra":
            row.respuestas_algebra = respuestas_json
            row.puntaje_algebra = puntaje
        elif materia == "trigonometria":
            row.respuestas_trigonometria = respuestas_json
            row.puntaje_trigonometria = puntaje
        elif materia == "geometria":
            row.respuestas_geometria = respuestas_json
            row.puntaje_geometria = puntaje
        elif materia == "calculo":
            row.respuestas_calculo = respuestas_json
            row.puntaje_calculo = puntaje

        promedios = [
            row.puntaje_algebra,
            row.puntaje_trigonometria,
            row.puntaje_geometria,
            row.puntaje_calculo,
        ]
        valid = [p for p in promedios if p is not None]
        row.promedio_diagnostico = sum(valid) / len(valid) if valid else None

    async def get_resultados_by_periodo(
        self, periodo: str
    ) -> list[ResultadoDiagnostico]:
        result = await self.db.execute(
            select(ResultadoDiagnostico).where(
                ResultadoDiagnostico.periodo == periodo
            )
        )
        return list(result.scalars().all())

    async def get_resultado(
        self, alumno_id: int, periodo: str
    ) -> ResultadoDiagnostico | None:
        result = await self.db.execute(
            select(ResultadoDiagnostico).where(
                ResultadoDiagnostico.alumno_id == alumno_id,
                ResultadoDiagnostico.periodo == periodo,
            )
        )
        return result.scalars().first()

    async def buscar_alumno(self, query: str) -> list[dict]:
        nfkd = unicodedata.normalize("NFKD", query.strip())
        q_no_accents = "".join(c for c in nfkd if not unicodedata.combining(c)).lower()
        q_like = f"%{q_no_accents}%"

        stmt = (
            select(Alumno, User)
            .join(User, Alumno.usuario_id == User.id)
            .options(selectinload(Alumno.ingenieria))
            .where(
                or_(
                    User.nombre.ilike(q_like),
                    User.apellido_paterno.ilike(q_like),
                    User.apellido_materno.ilike(q_like),
                    User.correo_personal.ilike(q_like),
                    Alumno.numero_cuenta.ilike(query.strip()),
                    Alumno.numero_folio.ilike(query.strip()),
                )
            )
            .limit(20)
        )
        result = await self.db.execute(stmt)
        rows = result.all()
        return [
            {
                "id": alumno.id,
                "nombre": alumno.usuario.nombre,
                "apellido_paterno": alumno.usuario.apellido_paterno,
                "apellido_materno": alumno.usuario.apellido_materno,
                "correo": alumno.usuario.correo_personal,
                "numero_cuenta": alumno.numero_cuenta,
                "numero_folio": alumno.numero_folio,
                "ingenieria": alumno.ingenieria.clave if alumno.ingenieria else None,
            }
            for alumno, _ in rows
        ]

    async def crear_alumno_rapido(
        self,
        nombre: str,
        apellido_paterno: str,
        apellido_materno: str,
        correo_personal: str,
        numero_cuenta: str | None,
        numero_folio: str | None,
        ingenieria_clave: str | None,
        periodo: str,
    ) -> dict:
        role = await self.db.scalar(select(Role).where(Role.name == "alumno"))
        if not role:
            raise ValueError("El rol de alumno no está configurado")

        ingenieria = None
        if ingenieria_clave:
            ingenieria = await self.db.scalar(
                select(Ingenieria).where(Ingenieria.clave == ingenieria_clave.upper())
            )

        user = User(
            nombre=nombre,
            apellido_paterno=apellido_paterno,
            apellido_materno=apellido_materno,
            correo_personal=correo_personal,
            auth_method=AuthMethod.NUMERO_CUENTA,
            activo=True,
            role_id=role.id,
        )
        self.db.add(user)
        await self.db.flush()

        alumno = Alumno(
            usuario_id=user.id,
            ingenieria_id=ingenieria.id if ingenieria else None,
            numero_cuenta=numero_cuenta or None,
            numero_folio=numero_folio or None,
            periodo_ingreso=periodo,
        )
        self.db.add(alumno)
        await self.db.flush()

        return {
            "id": alumno.id,
            "nombre": user.nombre,
            "apellido_paterno": user.apellido_paterno,
            "apellido_materno": user.apellido_materno,
            "correo": user.correo_personal,
            "numero_cuenta": alumno.numero_cuenta,
            "numero_folio": alumno.numero_folio,
            "ingenieria": ingenieria.clave if ingenieria else None,
        }

    async def get_status(self, periodo: str) -> dict:
        from sqlalchemy import func

        materias = ["algebra", "trigonometria", "geometria", "calculo"]
        status = {}

        for mat in materias:
            count_stmt = select(func.count()).select_from(ResultadoDiagnostico).where(
                ResultadoDiagnostico.periodo == periodo
            )
            if mat == "algebra":
                count_stmt = count_stmt.where(ResultadoDiagnostico.puntaje_algebra.isnot(None))
            elif mat == "trigonometria":
                count_stmt = count_stmt.where(ResultadoDiagnostico.puntaje_trigonometria.isnot(None))
            elif mat == "geometria":
                count_stmt = count_stmt.where(ResultadoDiagnostico.puntaje_geometria.isnot(None))
            elif mat == "calculo":
                count_stmt = count_stmt.where(ResultadoDiagnostico.puntaje_calculo.isnot(None))

            total = (await self.db.execute(count_stmt)).scalar_one()
            status[mat] = {"total_alumnos": total}

        return status

    async def get_respuesta_key_status(self, periodo: str) -> dict:
        from sqlalchemy import func

        materias = ["algebra", "trigonometria", "geometria", "calculo"]
        status = {}

        for mat in materias:
            count_stmt = select(func.count()).select_from(RespuestaCorrectaDiagnostico).where(
                RespuestaCorrectaDiagnostico.materia == mat,
                RespuestaCorrectaDiagnostico.periodo == periodo,
            )
            total = (await self.db.execute(count_stmt)).scalar_one()
            status[mat] = {"configurada": total > 0, "total_preguntas": total}

        return status
