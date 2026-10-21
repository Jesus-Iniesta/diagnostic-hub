"""Registro automático de alumnos desde los archivos de exámenes.

El padrón ya no es obligatorio: si una fila de un examen no coincide con ningún
alumno (por correo, cuenta, folio o identificadores guardados), el alumno se
registra como provisional con los datos que traiga la fila. Nunca se empareja
por nombre.

Si la fila sí coincide, se completan los datos que le falten al alumno (nombre,
ingeniería, lugar de admisión) sin borrar lo que ya tenía; cuenta, folio y
correos se guardan con RegistroIdentificadores.

Las filas sin correo, cuenta ni folio no se pueden registrar: se guardan en
fila_no_registrada para el Excel "Alumnos por revisar".

Uso dentro de una carga (después de load_all_alumnos):

    registro = RegistroIdentificadores(...)
    registrador = RegistroAutomatico(db, registro, periodo)
    alumno_id = await registrador.buscar_o_registrar(correos=[...], cuentas=[...], ...)
    await registrador.completar(alumno_id, nombre=..., ingenieria=...)
"""

from __future__ import annotations

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.fila_no_registrada import FilaNoRegistrada
from app.services.alumnos_provisionales_service import (
    completar_ingenieria_si_falta,
    completar_lugar_si_falta,
    completar_nombre_si_falta,
    crear_alumno_provisional,
    datos_para_provisionales,
)
from app.services.identificadores_service import RegistroIdentificadores

MOTIVO_SIN_IDENTIFICADORES = "Le faltó escribir su número de cuenta o folio."


def buscar_por_identificadores(
    correos,
    cuentas,
    folios,
    email_map: dict[str, int],
    cuenta_map: dict[str, int],
    folio_map: dict[str, int],
) -> int | None:
    """Primer alumno que coincide por correo, luego cuenta y luego folio."""
    for valores, mapa in ((correos, email_map), (cuentas, cuenta_map), (folios, folio_map)):
        for valor in valores or ():
            if valor and valor in mapa:
                return mapa[valor]
    return None


def _limpios(valores) -> list[str]:
    return [v for v in (valores or ()) if v]


class RegistroAutomatico:
    def __init__(
        self, db: AsyncSession, registro: RegistroIdentificadores, periodo: str
    ) -> None:
        from app.services.upload_diagnostico_service import normalizar_periodo

        self.db = db
        self.registro = registro
        self.periodo = normalizar_periodo(periodo) or periodo.strip()
        self.creados: list[dict] = []
        self.ids_creados: set[int] = set()
        self._datos: tuple[int | None, dict[str, str], dict[str, int]] | None = None

    async def _preparar(self) -> tuple[int | None, dict[str, str], dict[str, int]]:
        if self._datos is None:
            self._datos = await datos_para_provisionales(self.db)
        return self._datos

    async def ingenierias(self) -> dict[str, str]:
        """{clave: nombre} de las ingenierías (para reconocerla en el cuestionario)."""
        return (await self._preparar())[1]

    async def buscar_o_registrar(
        self,
        *,
        correos=(),
        cuentas=(),
        folios=(),
        nombre: tuple[str, str, str] | None = None,
        ingenieria: str | None = None,
        lugar_admision: int | None = None,
        indice: int | None = None,
    ) -> int | None:
        """Alumno de la fila; si no existe, lo registra como provisional.

        Devuelve None solo si no hay con qué identificarlo (sin correo, cuenta
        ni folio) o no se pudo crear.
        """
        correos, cuentas, folios = _limpios(correos), _limpios(cuentas), _limpios(folios)
        r = self.registro
        alumno_id = buscar_por_identificadores(
            correos, cuentas, folios, r.email_map, r.cuenta_map, r.folio_map
        )
        if alumno_id is not None:
            return alumno_id
        if not (correos or cuentas or folios):
            return None

        role_id, _, ingenieria_ids = await self._preparar()
        if role_id is None:
            return None
        clave = ingenieria if ingenieria in ingenieria_ids else None

        alumno_id = None
        correo_principal = None
        for correo in correos:
            alumno_id = await self._crear(role_id, clave, ingenieria_ids, correo, nombre, lugar_admision)
            if alumno_id is not None:
                correo_principal = correo
                break
        if alumno_id is None:
            # Sin correo, o todos son de otros usuarios (p. ej. un profesor):
            # se registra solo con cuenta/folio.
            if not (cuentas or folios):
                return None
            alumno_id = await self._crear(role_id, clave, ingenieria_ids, None, nombre, lugar_admision)
            if alumno_id is None:
                return None
            correos = []
        else:
            # Los correos que son de otro usuario no se guardan como identificadores.
            correos = [c for c in correos if c == correo_principal or c not in r.email_map]

        await r.registrar(
            alumno_id, correos=correos, cuentas=cuentas, folios=folios, indice=indice
        )
        detalle = r.alumno_details[alumno_id]
        self.ids_creados.add(alumno_id)
        self.creados.append(
            {
                "alumno_id": alumno_id,
                "nombre": detalle.get("nombre") or "",
                "correo": correo_principal,
                "cuenta": detalle.get("cuenta"),
                "folio": detalle.get("folio"),
                "ingenieria": clave,
                "indice": indice,
            }
        )
        return alumno_id

    async def _crear(self, role_id, clave, ingenieria_ids, correo, nombre, lugar) -> int | None:
        return await crear_alumno_provisional(
            self.db,
            role_id=role_id,
            ingenieria_id=ingenieria_ids.get(clave) if clave else None,
            ingenieria_clave=clave,
            periodo=self.periodo,
            correo=correo,
            lugar_admision=lugar,
            email_map=self.registro.email_map,
            alumno_details=self.registro.alumno_details,
            nombre=nombre,
        )

    async def completar(
        self,
        alumno_id: int,
        *,
        nombre: tuple[str, str, str] | None = None,
        ingenieria: str | None = None,
        lugar_admision: int | None = None,
    ) -> None:
        """Llena los datos que le falten al alumno, sin tocar los que ya tiene."""
        await completar_nombre_si_falta(
            self.db, alumno_id, nombre, self.registro.alumno_details
        )
        if ingenieria:
            _, _, ingenieria_ids = await self._preparar()
            await completar_ingenieria_si_falta(
                self.db, alumno_id, ingenieria, ingenieria_ids, self.registro.alumno_details
            )
        await completar_lugar_si_falta(self.db, alumno_id, lugar_admision)

    def resumen(self) -> dict:
        return {
            "registrados_nuevos": len(self.creados),
            "registrados_nuevos_detalle": self.creados,
        }


async def guardar_filas_no_registradas(
    db: AsyncSession, periodo: str, examen: str, filas: list[dict]
) -> None:
    """Reemplaza las filas no registradas de (periodo, examen).

    `filas`: [{"indice", "nombre", "ingenieria"}].
    """
    await db.execute(
        delete(FilaNoRegistrada).where(
            FilaNoRegistrada.periodo == periodo, FilaNoRegistrada.examen == examen
        )
    )
    for f in filas:
        db.add(
            FilaNoRegistrada(
                periodo=periodo,
                examen=examen,
                indice=f["indice"],
                nombre=(f.get("nombre") or None),
                ingenieria=(f.get("ingenieria") or None),
            )
        )


async def quitar_filas_no_registradas(
    db: AsyncSession, periodo: str, examen: str, indices
) -> None:
    """Quita las filas que el administrador ya asignó a mano a un alumno."""
    indices = list(indices)
    if not indices:
        return
    await db.execute(
        delete(FilaNoRegistrada).where(
            FilaNoRegistrada.periodo == periodo,
            FilaNoRegistrada.examen == examen,
            FilaNoRegistrada.indice.in_(indices),
        )
    )
