from __future__ import annotations

import io
import re
from dataclasses import dataclass, field

import openpyxl
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alumno import Alumno
from app.models.ingenieria import Ingenieria
from app.models.role import Role
from app.models.user import AuthMethod, User


# ── Columnas del Excel (índices 0-based) ──────────────────────────
COL_NOMBRE = 19
COL_APELLIDO_PATERNO = 17
COL_APELLIDO_MATERNO = 18
COL_CORREO_PERSONAL = 8
COL_CORREO_INSTITUCIONAL = 26
COL_NUMERO_CUENTA = 13
COL_NUMERO_FOLIO = 12
COL_INGENIERIA = 6
COL_PERIODO = 7
COL_PROMEDIO = 9
COL_INDICE_UAEM = 10
COL_LUGAR_ADMISION = 11
COL_TIENE_INTERNET = 15
COL_TIENE_COMPUTADORA = 16
COL_ES_FORANEO = 23
COL_CONVIVENCIA = 24
COL_VULNERABILIDAD = 27
COL_ESCUELA = 29


@dataclass
class FilaResultado:
    fila: int
    nombre_completo: str
    numero_cuenta: str | None
    estado: str  # "exitoso" | "duplicado" | "error"
    motivo: str = ""


@dataclass
class ResultadoCarga:
    total_filas: int = 0
    exitosos: int = 0
    duplicados: int = 0
    errores: int = 0
    detalle: list[FilaResultado] = field(default_factory=list)


def _clean_str(value: object | None) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _to_title(value: str) -> str:
    return value.title() if value else ""


def _parse_bool(value: object | None) -> bool:
    return _clean_str(value).lower() in ("sí", "si", "yes", "true", "1")


def _parse_float(value: object | None) -> float | None:
    s = _clean_str(value)
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _parse_int(value: object | None) -> int | None:
    s = _clean_str(value)
    if not s:
        return None
    try:
        return int(float(s))
    except ValueError:
        return None


def _extract_clave_ingenieria(raw: str) -> str | None:
    match = re.search(r"\((\w+)\)", raw)
    return match.group(1).upper() if match else None


def _clean_numero_cuenta(value: object | None) -> str | None:
    s = _clean_str(value)
    if not s or s == ".":
        return None
    digits = re.sub(r"\D", "", s)
    return digits if len(digits) == 7 else None


def _clean_numero_folio(value: object | None) -> str | None:
    s = _clean_str(value)
    if not s:
        return None
    digits = re.sub(r"\D", "", s)
    return digits if len(digits) == 9 else None


def _clean_email(value: object | None) -> str | None:
    s = _clean_str(value).lower()
    if not s or "@" not in s:
        return None
    return s


async def procesar_excel(db: AsyncSession, file_bytes: bytes) -> ResultadoCarga:
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]

    rows = list(ws.iter_rows(min_row=2, values_only=True))
    wb.close()

    result = ResultadoCarga(total_filas=len(rows))

    role = await db.scalar(select(Role).where(Role.name == "alumno"))
    if not role:
        result.errores = result.total_filas
        result.detalle = [
            FilaResultado(fila=i + 2, nombre_completo="", numero_cuenta=None,
                          estado="error", motivo="Rol 'alumno' no encontrado en la DB")
            for i in range(len(rows))
        ]
        return result

    ingenierias_rows = await db.execute(select(Ingenieria))
    ingenierias_map = {i.clave: i.id for i in ingenierias_rows.scalars()}

    existing_cuentas: set[str] = set()
    existing_folios: set[str] = set()
    existing_correos: set[str] = set()
    seen_cuentas: set[str] = set()
    seen_folios: set[str] = set()
    seen_correos: set[str] = set()

    if rows:
        all_cuentas = await db.execute(
            select(Alumno.numero_cuenta).where(Alumno.numero_cuenta.isnot(None))
        )
        existing_cuentas = {r[0] for r in all_cuentas}

        all_folios = await db.execute(
            select(Alumno.numero_folio).where(Alumno.numero_folio.isnot(None))
        )
        existing_folios = {r[0] for r in all_folios}

        all_correos = await db.execute(
            select(User.correo_personal).where(User.correo_personal.isnot(None))
        )
        existing_correos = {r[0] for r in all_correos}

    for idx, row in enumerate(rows):
        fila_num = idx + 2

        nombre = _to_title(_clean_str(row[COL_NOMBRE]))
        ap_paterno = _to_title(_clean_str(row[COL_APELLIDO_PATERNO]))
        ap_materno = _to_title(_clean_str(row[COL_APELLIDO_MATERNO]))
        correo = _clean_email(row[COL_CORREO_PERSONAL])
        correo_inst = _clean_email(row[COL_CORREO_INSTITUCIONAL])
        num_cuenta = _clean_numero_cuenta(row[COL_NUMERO_CUENTA])
        num_folio = _clean_numero_folio(row[COL_NUMERO_FOLIO])
        ingenieria_raw = _clean_str(row[COL_INGENIERIA])
        periodo = _clean_str(row[COL_PERIODO])
        promedio = _parse_float(row[COL_PROMEDIO])
        indice = _parse_float(row[COL_INDICE_UAEM])
        lugar = _parse_int(row[COL_LUGAR_ADMISION])
        internet = _parse_bool(row[COL_TIENE_INTERNET])
        computadora = _parse_bool(row[COL_TIENE_COMPUTADORA])
        foraneo = _parse_bool(row[COL_ES_FORANEO])
        convivencia = _clean_str(row[COL_CONVIVENCIA]) or None
        vulnerabilidad = _parse_bool(row[COL_VULNERABILIDAD])
        escuela = _clean_str(row[COL_ESCUELA]) or None

        nombre_completo = f"{nombre} {ap_paterno} {ap_materno}".strip()

        if not nombre or not ap_paterno or not ap_materno:
            result.errores += 1
            result.detalle.append(FilaResultado(
                fila=fila_num, nombre_completo=nombre_completo,
                numero_cuenta=num_cuenta, estado="error",
                motivo="Faltan nombre o apellidos",
            ))
            continue

        if not correo:
            result.errores += 1
            result.detalle.append(FilaResultado(
                fila=fila_num, nombre_completo=nombre_completo,
                numero_cuenta=num_cuenta, estado="error",
                motivo="Correo personal inválido o vacío",
            ))
            continue

        if not num_folio:
            result.errores += 1
            result.detalle.append(FilaResultado(
                fila=fila_num, nombre_completo=nombre_completo,
                numero_cuenta=num_cuenta, estado="error",
                motivo="Número de folio inválido (se requieren 9 dígitos)",
            ))
            continue

        clave_ingenieria = _extract_clave_ingenieria(ingenieria_raw)
        ingenieria_id = ingenierias_map.get(clave_ingenieria) if clave_ingenieria else None
        if not ingenieria_id:
            result.errores += 1
            result.detalle.append(FilaResultado(
                fila=fila_num, nombre_completo=nombre_completo,
                numero_cuenta=num_cuenta, estado="error",
                motivo=f"Ingeniería no reconocida: '{ingenieria_raw}'",
            ))
            continue

        if not periodo or not re.match(r"^\d{4}[AB]$", periodo):
            result.errores += 1
            result.detalle.append(FilaResultado(
                fila=fila_num, nombre_completo=nombre_completo,
                numero_cuenta=num_cuenta, estado="error",
                motivo=f"Periodo de ingreso inválido: '{periodo}'",
            ))
            continue

        is_dup = False
        dup_reason = ""

        if num_cuenta and (num_cuenta in existing_cuentas or num_cuenta in seen_cuentas):
            is_dup = True
            dup_reason = f"Duplicate numero_cuenta '{num_cuenta}'"
        if num_folio and (num_folio in existing_folios or num_folio in seen_folios):
            is_dup = True
            dup_reason = dup_reason or f"Duplicate numero_folio '{num_folio}'"
        if correo in existing_correos or correo in seen_correos:
            is_dup = True
            dup_reason = dup_reason or f"Duplicate correo '{correo}'"

        if is_dup:
            result.duplicados += 1
            result.detalle.append(FilaResultado(
                fila=fila_num, nombre_completo=nombre_completo,
                numero_cuenta=num_cuenta, estado="duplicado",
                motivo=dup_reason,
            ))
            continue

        if num_cuenta:
            seen_cuentas.add(num_cuenta)
        seen_folios.add(num_folio)
        seen_correos.add(correo)

        user = User(
            nombre=nombre,
            apellido_paterno=ap_paterno,
            apellido_materno=ap_materno,
            correo_personal=correo,
            correo_institucional=correo_inst,
            auth_method=AuthMethod.NUMERO_CUENTA,
            activo=True,
            role_id=role.id,
        )
        db.add(user)
        await db.flush()

        alumno = Alumno(
            usuario_id=user.id,
            ingenieria_id=ingenieria_id,
            numero_cuenta=num_cuenta,
            numero_folio=num_folio,
            periodo_ingreso=periodo,
            promedio_bachillerato=promedio,
            indice_uaem=indice,
            lugar_admision=lugar,
            escuela_procedencia=escuela,
            tiene_internet=internet,
            tiene_computadora=computadora,
            es_foraneo=foraneo,
            convivencia=convivencia,
            vulnerabilidad_economica=vulnerabilidad,
        )
        db.add(alumno)
        result.exitosos += 1
        result.detalle.append(FilaResultado(
            fila=fila_num, nombre_completo=nombre_completo,
            numero_cuenta=num_cuenta, estado="exitoso",
        ))

    await db.commit()
    return result
