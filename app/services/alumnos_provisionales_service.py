"""Crea y completa alumnos provisionales (ver alumnos_provisionales.py)."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alumno import Alumno
from app.models.identificador_alumno import IdentificadorAlumno
from app.models.ingenieria import Ingenieria
from app.models.role import Role
from app.models.user import AuthMethod, User
from app.services.alumnos_provisionales import nombre_vacio


async def datos_para_provisionales(
    db: AsyncSession,
) -> tuple[int | None, dict[str, str], dict[str, int]]:
    """(id del rol alumno, {clave: nombre}, {clave: id}) de las ingenierías."""
    role_id = await db.scalar(select(Role.id).where(Role.name == "alumno"))
    rows = (await db.execute(select(Ingenieria))).scalars().all()
    return role_id, {i.clave: i.nombre for i in rows}, {i.clave: i.id for i in rows}


async def crear_alumno_provisional(
    db: AsyncSession,
    *,
    role_id: int,
    ingenieria_id: int,
    ingenieria_clave: str,
    periodo: str,
    correo: str,
    lugar_admision: int | None,
    email_map: dict[str, int],
    alumno_details: dict[int, dict],
) -> int | None:
    """Crea usuario + alumno provisional y lo agrega a los mapas en memoria.

    El correo debe estar normalizado y no pertenecer a ningún alumno (si
    perteneciera, la fila se habría emparejado). Devuelve None si el correo ya
    es de otro usuario (p. ej. un profesor). Cuenta, folio y demás correos se
    agregan después con RegistroIdentificadores.
    """
    ocupado = await db.scalar(
        select(User.id).where(
            (User.correo_personal == correo) | (User.correo_institucional == correo)
        )
    )
    if ocupado is not None:
        return None

    user = User(
        nombre="",
        apellido_paterno="",
        apellido_materno="",
        correo_personal=correo,
        auth_method=AuthMethod.NUMERO_CUENTA,
        activo=True,
        role_id=role_id,
    )
    db.add(user)
    await db.flush()

    alumno = Alumno(
        usuario_id=user.id,
        ingenieria_id=ingenieria_id,
        periodo_ingreso=periodo,
        lugar_admision=lugar_admision,
        es_provisional=True,
    )
    db.add(alumno)
    await db.flush()

    email_map[correo] = alumno.id
    alumno_details[alumno.id] = {
        "nombre": "",
        "cuenta": None,
        "folio": None,
        "correo": correo,
        "ingenieria": ingenieria_clave,
        "periodo_ingreso": periodo,
        "provisional": True,
    }
    return alumno.id


async def completar_nombre_si_falta(
    db: AsyncSession,
    alumno_id: int,
    nombre: tuple[str, str, str] | None,
    alumno_details: dict[int, dict],
) -> bool:
    """Pone nombre a un alumno provisional que aún no tiene. True si lo cambió."""
    detalle = alumno_details.get(alumno_id)
    if (
        nombre is None
        or detalle is None
        or not detalle.get("provisional")
        or not nombre_vacio(detalle.get("nombre"))
    ):
        return False

    alumno = await db.get(Alumno, alumno_id)
    user = await db.get(User, alumno.usuario_id)
    user.nombre, user.apellido_paterno, user.apellido_materno = nombre
    detalle["nombre"] = " ".join(p for p in nombre if p)
    return True


async def completar_provisional_con_padron(
    db: AsyncSession,
    alumno_id: int,
    *,
    nombre: str,
    ap_paterno: str,
    ap_materno: str,
    correo: str | None,
    correo_inst: str | None,
    num_cuenta: str | None,
    num_folio: str | None,
    ingenieria_id: int,
    datos_alumno: dict,
    email_map: dict[str, int],
    cuenta_map: dict[str, int],
    folio_map: dict[str, int],
    alumno_details: dict[int, dict],
) -> None:
    """Llena un alumno provisional con su fila del padrón y lo deja como normal.

    `datos_alumno` son los campos de Alumno del formulario (periodo_ingreso,
    promedio_bachillerato, indice_uaem, ...). Solo se asignan correo, cuenta y
    folio que no sean de otro alumno; el correo con el que se creó se conserva
    como identificador para seguir encontrándolo con él.
    """
    alumno = await db.get(Alumno, alumno_id)
    user = await db.get(User, alumno.usuario_id)

    def libre(mapa: dict[str, int], valor: str | None) -> bool:
        return bool(valor) and mapa.get(valor) in (None, alumno_id)

    correo_anterior = user.correo_personal

    user.nombre = nombre
    user.apellido_paterno = ap_paterno
    user.apellido_materno = ap_materno
    if libre(email_map, correo) and correo != correo_anterior:
        user.correo_personal = correo
        email_map[correo] = alumno_id
        await _conservar_correo(db, alumno_id, correo_anterior)
    if libre(email_map, correo_inst) and not user.correo_institucional:
        user.correo_institucional = correo_inst
        email_map[correo_inst] = alumno_id

    alumno.ingenieria_id = ingenieria_id
    for campo, valor in datos_alumno.items():
        setattr(alumno, campo, valor)
    if libre(cuenta_map, num_cuenta):
        alumno.numero_cuenta = num_cuenta
        cuenta_map[num_cuenta] = alumno_id
    if libre(folio_map, num_folio):
        alumno.numero_folio = num_folio
        folio_map[num_folio] = alumno_id
    alumno.es_provisional = False

    detalle = alumno_details.get(alumno_id)
    if detalle is not None:
        detalle.update(
            nombre=f"{nombre} {ap_paterno} {ap_materno}",
            cuenta=alumno.numero_cuenta,
            folio=alumno.numero_folio,
            correo=user.correo_personal,
            provisional=False,
        )


async def _conservar_correo(db: AsyncSession, alumno_id: int, correo: str | None) -> None:
    """Guarda como identificador el correo que deja de ser el personal."""
    if not correo:
        return
    existe = await db.scalar(
        select(IdentificadorAlumno.id).where(
            IdentificadorAlumno.tipo == "correo", IdentificadorAlumno.valor == correo
        )
    )
    if existe is None:
        db.add(
            IdentificadorAlumno(
                alumno_id=alumno_id, tipo="correo", valor=correo, fuente="padron"
            )
        )
