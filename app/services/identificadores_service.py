"""Guarda en la base los identificadores que se aprenden al cargar archivos.

Uso dentro de una carga (después de load_all_alumnos):

    registro = RegistroIdentificadores(
        db, email_map, cuenta_map, folio_map, alumno_details, fuente="cuestionario:1"
    )
    await registro.registrar(alumno_id, correos=[...], cuentas=[...], folios=[...], indice=idx)
    ...
    await db.commit()
    respuesta.update(registro.resumen())
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alumno import Alumno
from app.models.identificador_alumno import IdentificadorAlumno
from app.services.identificadores import (
    agregar_identificadores_extra,
    aplicar_plan_en_memoria,
    planear_identificadores,
)


async def cargar_identificadores_extra(
    db: AsyncSession,
    email_map: dict[str, int],
    cuenta_map: dict[str, int],
    folio_map: dict[str, int],
) -> None:
    result = await db.execute(
        select(
            IdentificadorAlumno.tipo,
            IdentificadorAlumno.valor,
            IdentificadorAlumno.alumno_id,
        )
    )
    agregar_identificadores_extra(result.all(), email_map, cuenta_map, folio_map)


class RegistroIdentificadores:
    def __init__(
        self,
        db: AsyncSession,
        email_map: dict[str, int],
        cuenta_map: dict[str, int],
        folio_map: dict[str, int],
        alumno_details: dict[int, dict],
        fuente: str,
    ) -> None:
        self.db = db
        self.email_map = email_map
        self.cuenta_map = cuenta_map
        self.folio_map = folio_map
        self.alumno_details = alumno_details
        self.fuente = fuente[:60]
        self.nuevos = 0
        self.conflictos: list[dict] = []

    async def registrar(
        self,
        alumno_id: int,
        *,
        correos=(),
        cuentas=(),
        folios=(),
        indice: int | None = None,
    ) -> None:
        detalle = self.alumno_details.get(alumno_id)
        if detalle is None:
            return

        plan = planear_identificadores(
            alumno_id,
            correos=correos,
            cuentas=cuentas,
            folios=folios,
            email_map=self.email_map,
            cuenta_map=self.cuenta_map,
            folio_map=self.folio_map,
            cuenta_actual=detalle.get("cuenta"),
            folio_actual=detalle.get("folio"),
        )

        for c in plan.conflictos:
            c["indice"] = indice
            c["fuente"] = self.fuente
            self.conflictos.append(c)

        if plan.total_nuevos == 0:
            return

        for correo in plan.correos_nuevos:
            self._agregar(alumno_id, "correo", correo)
        if plan.cuenta_nueva or plan.folio_nuevo:
            # El alumno no tenía cuenta/folio: se llena su registro para que salga
            # en el CREANI, y también se deja constancia de dónde salió.
            alumno = await self.db.get(Alumno, alumno_id)
            if plan.cuenta_nueva:
                alumno.numero_cuenta = plan.cuenta_nueva
                self._agregar(alumno_id, "cuenta", plan.cuenta_nueva)
            if plan.folio_nuevo:
                alumno.numero_folio = plan.folio_nuevo
                self._agregar(alumno_id, "folio", plan.folio_nuevo)

        aplicar_plan_en_memoria(
            alumno_id,
            plan,
            self.email_map,
            self.cuenta_map,
            self.folio_map,
            self.alumno_details,
        )
        self.nuevos += plan.total_nuevos

    def _agregar(self, alumno_id: int, tipo: str, valor: str) -> None:
        self.db.add(
            IdentificadorAlumno(
                alumno_id=alumno_id, tipo=tipo, valor=valor, fuente=self.fuente
            )
        )

    def resumen(self) -> dict:
        return {
            "identificadores_nuevos": self.nuevos,
            "conflictos_identificadores": self.conflictos,
        }
