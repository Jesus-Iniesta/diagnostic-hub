"""Reglas para aprender identificadores (correo, cuenta, folio) de un alumno.

Cuando una fila de cualquier archivo se empareja con un alumno, trae datos que
quizá el registro no tenía (otro correo, la cuenta, el folio). Guardarlos hace
que las siguientes cargas encuentren al alumno aunque usen un dato distinto.

Este módulo solo DECIDE qué hacer; no toca la base de datos (eso lo hace
identificadores_service.py), así que se puede probar sin PostgreSQL.

Reglas:
- Un identificador pertenece a un solo alumno. Si ya es de otro alumno, NO se
  mueve: se reporta como conflicto (alguien escribió el dato de otro, o son dos
  registros de la misma persona) para que lo revise el administrador.
- Correos: un alumno puede tener varios (personal, institucional, otro); los
  nuevos se guardan.
- Cuenta y folio: un alumno tiene uno de cada uno. Si no lo tenía, se le asigna;
  si ya tenía uno distinto, se reporta y no se guarda (suele ser un error de
  captura, y guardarlo podría "robarle" el dato al alumno real).
"""

from __future__ import annotations

from dataclasses import dataclass, field

TIPOS = ("correo", "cuenta", "folio")

PERTENECE_A_OTRO = "pertenece_a_otro_alumno"
DISTINTO_AL_REGISTRADO = "distinto_al_registrado"


@dataclass
class PlanIdentificadores:
    correos_nuevos: list[str] = field(default_factory=list)
    cuenta_nueva: str | None = None
    folio_nuevo: str | None = None
    conflictos: list[dict] = field(default_factory=list)

    @property
    def total_nuevos(self) -> int:
        return (
            len(self.correos_nuevos)
            + (1 if self.cuenta_nueva else 0)
            + (1 if self.folio_nuevo else 0)
        )


def _unicos(valores) -> list[str]:
    vistos: list[str] = []
    for v in valores or ():
        if v and v not in vistos:
            vistos.append(v)
    return vistos


def _conflicto(tipo: str, valor: str, alumno_id: int, motivo: str, otro: int | None) -> dict:
    return {
        "tipo": tipo,
        "valor": valor,
        "alumno_id": alumno_id,
        "alumno_id_existente": otro,
        "motivo": motivo,
    }


def _planear_unico(
    tipo: str,
    valores: list[str],
    alumno_id: int,
    mapa: dict[str, int],
    actual: str | None,
    plan: PlanIdentificadores,
) -> str | None:
    """Cuenta o folio: devuelve el valor a asignar (o None) y anota conflictos."""
    asignado: str | None = None
    for v in valores:
        dueno = mapa.get(v)
        if dueno == alumno_id:
            continue
        if dueno is not None:
            plan.conflictos.append(_conflicto(tipo, v, alumno_id, PERTENECE_A_OTRO, dueno))
            continue
        registrado = actual or asignado
        if registrado and registrado != v:
            plan.conflictos.append(
                _conflicto(tipo, v, alumno_id, DISTINTO_AL_REGISTRADO, None)
            )
            continue
        asignado = v
    return asignado


def planear_identificadores(
    alumno_id: int,
    *,
    correos=(),
    cuentas=(),
    folios=(),
    email_map: dict[str, int],
    cuenta_map: dict[str, int],
    folio_map: dict[str, int],
    cuenta_actual: str | None,
    folio_actual: str | None,
) -> PlanIdentificadores:
    """Decide qué identificadores de una fila se le agregan al alumno.

    Los valores deben venir ya normalizados (normalizar_correo, normalizar_cuenta,
    normalizar_folio). Los mapas son los de load_all_alumnos.
    """
    plan = PlanIdentificadores()

    for correo in _unicos(correos):
        dueno = email_map.get(correo)
        if dueno == alumno_id:
            continue
        if dueno is not None:
            plan.conflictos.append(
                _conflicto("correo", correo, alumno_id, PERTENECE_A_OTRO, dueno)
            )
            continue
        plan.correos_nuevos.append(correo)

    plan.cuenta_nueva = _planear_unico(
        "cuenta", _unicos(cuentas), alumno_id, cuenta_map, cuenta_actual, plan
    )
    plan.folio_nuevo = _planear_unico(
        "folio", _unicos(folios), alumno_id, folio_map, folio_actual, plan
    )
    return plan


def aplicar_plan_en_memoria(
    alumno_id: int,
    plan: PlanIdentificadores,
    email_map: dict[str, int],
    cuenta_map: dict[str, int],
    folio_map: dict[str, int],
    alumno_details: dict[int, dict],
) -> None:
    """Actualiza los mapas para que el resto de la carga ya vea los datos nuevos."""
    for correo in plan.correos_nuevos:
        email_map[correo] = alumno_id
    detalle = alumno_details.get(alumno_id)
    if plan.cuenta_nueva:
        cuenta_map[plan.cuenta_nueva] = alumno_id
        if detalle is not None:
            detalle["cuenta"] = plan.cuenta_nueva
    if plan.folio_nuevo:
        folio_map[plan.folio_nuevo] = alumno_id
        if detalle is not None:
            detalle["folio"] = plan.folio_nuevo


def agregar_identificadores_extra(
    filas,
    email_map: dict[str, int],
    cuenta_map: dict[str, int],
    folio_map: dict[str, int],
) -> None:
    """Suma a los mapas los identificadores guardados (tipo, valor, alumno_id).

    Los datos del registro tienen prioridad: si un valor ya está en el mapa no se
    sobrescribe.
    """
    mapas = {"correo": email_map, "cuenta": cuenta_map, "folio": folio_map}
    for tipo, valor, alumno_id in filas:
        mapa = mapas.get(tipo)
        if mapa is not None and valor:
            mapa.setdefault(valor, alumno_id)
