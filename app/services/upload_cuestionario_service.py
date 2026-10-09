from __future__ import annotations

import json
import re
import unicodedata
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alumno import Alumno
from app.models.resultado_cuestionario_diagnostico import (
    ResultadoCuestionarioDiagnostico,
)
from app.seeds.data.respuestas_cuestionario_diagnostico import (
    DEFAULT_RESPUESTAS_CUESTIONARIO,
)
from app.services.normalizacion import (
    clasificar_identificador,
    normalizar_cuenta,
)
from app.services.upload_diagnostico_service import (
    clave_identidad_no_encontrado,
    decidir_periodo_fila,
    deduplicar_primer_intento,
    extract_answer_key_from_raw,
    load_all_alumnos,
    normalize_name,
    normalizar_periodo,
    obtener_rango_periodo,
    omitida_detalle,
    rango_fechas_dict,
    ts_sort_key,
)
from app.services.alumnos_provisionales import (
    clave_ingenieria_fila,
    lugar_desde_usuario,
)
from app.services.alumnos_provisionales_service import (
    crear_alumno_provisional,
    datos_para_provisionales,
)
from app.services.excel_utils import leer_filas
from app.services.identificadores_service import RegistroIdentificadores
from app.services.upload_webassign_service import clean_email

MATERIA_FOR_CODE = {
    "A": "algebra",
    "T": "trigonometria",
    "G": "geometria",
    "C": "calculo",
}

CUESTIONARIO_CODES = {
    1: [f"{letra}{n}" for letra in "ATGC" for n in range(1, 11)],
    2: [f"{letra}{n}" for letra in "ATGC" for n in range(11, 21)],
}

C1_ACIERTOS_COL = {
    "algebra": "aciertos_c1_algebra",
    "trigonometria": "aciertos_c1_trigonometria",
    "geometria": "aciertos_c1_geometria",
    "calculo": "aciertos_c1_calculo",
}

C2_ACIERTOS_COL = {
    "algebra": "aciertos_c2_algebra",
    "trigonometria": "aciertos_c2_trigonometria",
    "geometria": "aciertos_c2_geometria",
    "calculo": "aciertos_c2_calculo",
}

USUARIO_RE = re.compile(r"^([A-Za-z]{2,5})[_\-\s]?\s*(\d+)$")


def _valor(row: tuple, idx: int | None) -> object | None:
    if idx is None or idx >= len(row):
        return None
    return row[idx]


def _header_text(raw: object | None) -> str:
    if raw is None:
        return ""
    return str(raw).strip()


def _sin_acentos(texto: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn"
    )


def _fecha_desde_ts(raw: object | None) -> str | None:
    """Representación de una marca temporal para mostrar en el frontend."""
    if isinstance(raw, (datetime, date)):
        return raw.isoformat()
    if raw is None or str(raw).strip() == "":
        return None
    return str(raw).strip()


def detectar_columnas_cuestionario(headers: list) -> dict:
    """Detecta columnas por el texto del encabezado (posiciones variables)."""
    cols = {
        "email": None,
        "folio": None,
        "usuario": None,
        "comercial": None,
        "institucional": None,
        "num_cuenta": None,
        "score": None,
        "timestamp": None,
        "nombre": None,
        "periodo_marcado": None,
        "ingenieria": None,
        "preguntas": {},
    }

    for idx, raw in enumerate(headers):
        s = _header_text(raw)
        low = s.lower()
        if not low:
            continue

        # Va antes de las demás reglas: el encabezado puede contener otras
        # palabras clave (p. ej. "fecha") que lo confundirían con otra columna.
        if "periodo de ingreso" in _sin_acentos(low):
            if cols["periodo_marcado"] is None:
                cols["periodo_marcado"] = idx
            continue

        matches = list(re.finditer(r"\(([ATGC])(\d+)\)", s))
        if matches:
            m = matches[-1]
            code = f"{m.group(1)}{int(m.group(2))}"
            if code not in cols["preguntas"]:
                cols["preguntas"][code] = idx
            continue

        if "comercial" in low:
            if cols["comercial"] is None:
                cols["comercial"] = idx
        elif "institucional" in low:
            if cols["institucional"] is None:
                cols["institucional"] = idx
        elif "email" in low or "correo" in low:
            if cols["email"] is None:
                cols["email"] = idx
        elif "cuenta" in low:
            if cols["num_cuenta"] is None:
                cols["num_cuenta"] = idx
        elif "folio" in low:
            if cols["folio"] is None:
                cols["folio"] = idx
        elif "usuario" in low:
            if cols["usuario"] is None:
                cols["usuario"] = idx
        elif "ingenier" in _sin_acentos(low):
            if cols["ingenieria"] is None:
                cols["ingenieria"] = idx
        elif "score" in low:
            if cols["score"] is None:
                cols["score"] = idx
        elif "timestamp" in low or "marca" in low or "fecha" in low or "hora" in low:
            if cols["timestamp"] is None:
                cols["timestamp"] = idx
        elif "nombre" in low:
            if cols["nombre"] is None:
                cols["nombre"] = idx

    if cols["email"] is None and len(headers) > 1:
        cols["email"] = 1
    if cols["folio"] is None and len(headers) > 3:
        cols["folio"] = 3
    if cols["usuario"] is None and len(headers) > 5:
        cols["usuario"] = 5
    if cols["timestamp"] is None and len(headers) > 0:
        cols["timestamp"] = 0

    return cols


def parse_usuario(usuario: object | None) -> tuple[str | None, int | None]:
    """Ej. 'ICO_118' -> ('ICO', 118). Clave de ingeniería + lugar de admisión."""
    if usuario is None:
        return None, None
    s = str(usuario).strip().upper()
    m = USUARIO_RE.match(s)
    if m:
        return m.group(1), int(m.group(2))
    return None, None


def _leer_workbook(file_bytes: bytes) -> tuple[list[str], list[tuple]]:
    filas = leer_filas(file_bytes)
    header_row = filas[0] if filas else None
    rows = filas[1:]

    if header_row is None:
        raise ValueError("El archivo no tiene fila de encabezados")

    headers = [_header_text(h) for h in header_row]
    return headers, rows


def _correos_fila(row: tuple, cols: dict) -> list[str]:
    emails: list[str] = []
    for key in ("email", "comercial", "institucional"):
        raw = _valor(row, cols[key])
        if raw is None:
            continue
        em = clean_email(raw)
        if em and em not in emails:
            emails.append(em)
    return emails


def _identificadores_fila(row: tuple, cols: dict) -> tuple[list[str], list[str]]:
    cuentas: list[str] = []
    folios: list[str] = []

    raw = _valor(row, cols["folio"])
    tipo, valor = clasificar_identificador(raw)
    if tipo == "cuenta":
        cuentas.append(valor)
    elif tipo == "folio":
        folios.append(valor)

    raw_cuenta = _valor(row, cols["num_cuenta"])
    if raw_cuenta is not None:
        cuenta = normalizar_cuenta(raw_cuenta)
        if cuenta:
            cuentas.append(cuenta)

    return cuentas, folios


def _obtener_timestamp(row: tuple, cols: dict) -> object | None:
    return _valor(row, cols["timestamp"])


def _periodo_marcado(row: tuple, cols: dict) -> str | None:
    """Periodo de ingreso que marcó el alumno (ej. '2026A'); None si viene vacío
    o con otro formato."""
    raw = _valor(row, cols.get("periodo_marcado"))
    if raw is None:
        return None
    return normalizar_periodo(str(raw))


def _emparejar_fila(
    row: tuple,
    cols: dict,
    email_map: dict[str, int],
    cuenta_map: dict[str, int],
    folio_map: dict[str, int],
) -> tuple[int | None, list[str], list[str], list[str]]:
    """Empareja la fila por correo, luego cuenta y luego folio.

    Devuelve (alumno_id, correos, cuentas, folios)."""
    emails = _correos_fila(row, cols)
    cuentas, folios = _identificadores_fila(row, cols)
    for em in emails:
        if em in email_map:
            return email_map[em], emails, cuentas, folios
    for c in cuentas:
        if c in cuenta_map:
            return cuenta_map[c], emails, cuentas, folios
    for f in folios:
        if f in folio_map:
            return folio_map[f], emails, cuentas, folios
    return None, emails, cuentas, folios


def _decidir_fila(
    idx: int,
    row: tuple,
    cols: dict,
    periodo: str,
    rango,
    alumno_id: int | None,
    emails: list[str],
    folios: list[str],
    alumno_details: dict[int, dict],
) -> dict | None:
    """None si la fila pertenece al periodo; si no, el detalle de la omitida."""
    ts = _obtener_timestamp(row, cols)
    pertenece, razon, periodo_detectado = decidir_periodo_fila(
        periodo,
        rango,
        ts,
        alumno_details.get(alumno_id) if alumno_id is not None else None,
        _periodo_marcado(row, cols),
    )
    if pertenece:
        return None
    return omitida_detalle(
        idx,
        emails[0] if emails else None,
        folios[0] if folios else None,
        ts,
        periodo_detectado,
        razon,
    )


def _identificador_contradice(
    ids_fila: list[str], id_candidato: str | None
) -> bool:
    """True si la fila trae un identificador del tipo (folio o cuenta) y el
    candidato tiene registrado uno distinto. Si fueran iguales la fila ya se
    habría encontrado por ese identificador."""
    if not id_candidato:
        return False
    return any(i != id_candidato for i in ids_fila)


def _respuestas_key_default() -> dict[str, str]:
    flat: dict[str, str] = {}
    for por_materia in DEFAULT_RESPUESTAS_CUESTIONARIO.values():
        flat.update(por_materia)
    return flat


def calcular_aciertos_cuestionario(
    row: tuple,
    preguntas: dict[str, int],
    respuestas_key: dict[str, str],
    codes: list[str],
) -> tuple[dict[str, int], list[dict]]:
    aciertos = {"algebra": 0, "trigonometria": 0, "geometria": 0, "calculo": 0}
    detalle: list[dict] = []
    for code in codes:
        idx = preguntas.get(code)
        if idx is None:
            detalle.append({"codigo": code, "respuesta": "", "correcta": False})
            continue
        raw = _valor(row, idx)
        respuesta = extract_answer_key_from_raw(raw)
        correcta = bool(respuesta) and respuesta == respuestas_key.get(code, "")
        if correcta:
            aciertos[MATERIA_FOR_CODE[code[0]]] += 1
        detalle.append(
            {
                "codigo": code,
                "respuesta": respuesta or "",
                "correcta": correcta,
            }
        )
    return aciertos, detalle


def _filtro_preguntas(cols: dict, cuestionario: int) -> dict[str, int]:
    allowed = set(CUESTIONARIO_CODES[cuestionario])
    return {code: idx for code, idx in cols["preguntas"].items() if code in allowed}


async def _upsert_cuestionario(
    db: AsyncSession,
    alumno_id: int,
    periodo: str,
    cuestionario: int,
    aciertos: dict[str, int],
    respuestas_json: str,
) -> None:
    result = await db.execute(
        select(ResultadoCuestionarioDiagnostico).where(
            ResultadoCuestionarioDiagnostico.alumno_id == alumno_id,
            ResultadoCuestionarioDiagnostico.periodo == periodo,
        )
    )
    row = result.scalars().first()
    if row is None:
        row = ResultadoCuestionarioDiagnostico(alumno_id=alumno_id, periodo=periodo)
        db.add(row)

    cols_map = C1_ACIERTOS_COL if cuestionario == 1 else C2_ACIERTOS_COL
    for materia, col in cols_map.items():
        setattr(row, col, aciertos[materia])
    if cuestionario == 1:
        row.respuestas_c1 = respuestas_json
    else:
        row.respuestas_c2 = respuestas_json

    await db.flush()


async def _indice_usuario(
    db: AsyncSession,
    alumno_details: dict[int, dict],
    periodo: str,
) -> dict[tuple[str, int], list[int]]:
    """Índice por (ingeniería, lugar de admisión) SOLO de la generación del periodo.

    El lugar de admisión se repite cada año, así que se restringe a los alumnos
    cuyo periodo_ingreso (sin espacios, en mayúsculas) coincide con el periodo
    que se está subiendo.
    """
    result = await db.execute(
        select(Alumno.id, Alumno.lugar_admision, Alumno.periodo_ingreso)
    )
    filas = result.all()
    periodo_norm = "".join(str(periodo).upper().split())

    index: dict[tuple[str, int], list[int]] = {}
    for aid, lugar, periodo_ingreso in filas:
        if "".join(str(periodo_ingreso).upper().split()) != periodo_norm:
            continue
        info = alumno_details.get(aid)
        if info is None:
            continue
        clave = (info.get("ingenieria") or "").upper()
        if clave and lugar is not None:
            index.setdefault((clave, lugar), []).append(aid)
    return index


def _detalle_resultado(
    bad: dict, alumno_id: int, aciertos: dict[str, int], detalle: list[dict]
) -> dict:
    info = bad[alumno_id]
    return {
        "alumno_id": alumno_id,
        "nombre_completo": info["nombre"],
        "numero_cuenta": info["cuenta"],
        "numero_folio": info["folio"],
        "correo": info["correo"],
        "ingenieria": info["ingenieria"],
        "aciertos": aciertos,
        "respuestas": detalle,
    }


async def procesar_cuestionario(
    db: AsyncSession,
    file_bytes: bytes,
    cuestionario: int,
    periodo: str,
) -> dict:
    if cuestionario not in (1, 2):
        raise ValueError(f"Cuestionario no válido: {cuestionario}")

    headers, rows = _leer_workbook(file_bytes)
    cols = detectar_columnas_cuestionario(headers)
    preguntas = _filtro_preguntas(cols, cuestionario)
    respuestas_key = _respuestas_key_default()

    email_map, cuenta_map, folio_map, alumno_details = await load_all_alumnos(db)
    usuario_index = await _indice_usuario(db, alumno_details, periodo)

    rango = await obtener_rango_periodo(db, periodo)

    encontrados_cola: list[dict] = []
    no_encontrados: list[dict] = []
    omitidas_detalle: list[dict] = []
    # Omitidas que sí corresponden a un alumno del periodo que se está cargando.
    omitidas_periodo_detalle: list[dict] = []
    # Filas del periodo sin alumno ni candidato: se crean como provisionales.
    sin_registro: list[dict] = []
    periodo_key = normalizar_periodo(periodo) or "".join(str(periodo).upper().split())

    for idx, row in enumerate(rows):
        ts = _obtener_timestamp(row, cols)
        alumno_id, emails, cuentas, folios = _emparejar_fila(
            row, cols, email_map, cuenta_map, folio_map
        )

        # Primero se empareja; luego se decide si la fila es del periodo subido.
        # El primer intento se aplica solo entre las filas que sí pertenecen.
        omitida = _decidir_fila(
            idx, row, cols, periodo, rango, alumno_id, emails, folios, alumno_details
        )
        if omitida is not None:
            omitidas_detalle.append(omitida)
            info = alumno_details.get(alumno_id) if alumno_id is not None else None
            registro_periodo = (
                normalizar_periodo(str(info.get("periodo_ingreso") or ""))
                if info
                else None
            )
            if registro_periodo and registro_periodo == periodo_key:
                omitidas_periodo_detalle.append(
                    {
                        "nombre": info["nombre"],
                        "correo": emails[0] if emails else info["correo"],
                        "fecha": _fecha_desde_ts(ts),
                    }
                )
            continue

        usuario_raw = _valor(row, cols["usuario"])
        nombre = normalize_name(_valor(row, cols["nombre"]))

        if alumno_id is None:
            motivo = "Sin coincidencia de correo/cuenta/folio"
            candidatos: list[dict] = []
            clave, lugar = parse_usuario(usuario_raw)
            if clave and lugar is not None:
                ids = usuario_index.get((clave, lugar))
                if ids and len(ids) == 1:
                    info = alumno_details[ids[0]]
                    contradictorio = _identificador_contradice(
                        folios, info["folio"]
                    ) or _identificador_contradice(cuentas, info["cuenta"])
                    if not contradictorio:
                        candidatos.append(
                            {
                                "alumno_id": ids[0],
                                "nombre": info["nombre"],
                                "cuenta": info["cuenta"],
                                "correo": info["correo"],
                                "sugerido": True,
                                "motivo": "Coincidencia por usuario (carrera + lugar): confirmar",
                            }
                        )
                        motivo = (
                            "Sin coincidencia de correo/cuenta/folio; "
                            "usuario coincide con un solo alumno (carrera + lugar)"
                        )
            fila_no_encontrada = (
                {
                    "nombre_original": nombre,
                    "correo": emails[0] if emails else None,
                    "cuenta": cuentas[0] if cuentas else None,
                    "folio": folios[0] if folios else None,
                    "usuario": str(usuario_raw).strip()
                    if usuario_raw is not None
                    else None,
                    "cuestionario": cuestionario,
                    "motivo": motivo,
                    "candidatos": candidatos,
                    "indice": idx,
                    "_ts": ts,
                    "_clave_identidad": clave_identidad_no_encontrado(
                        emails[0] if emails else None,
                        folios[0] if folios else None,
                        cuentas[0] if cuentas else None,
                        str(usuario_raw).strip() if usuario_raw is not None else None,
                    ),
                }
            )
            if not candidatos and emails:
                sin_registro.append(
                    {
                        "idx": idx,
                        "row": row,
                        "ts": ts,
                        "emails": emails,
                        "cuentas": cuentas,
                        "folios": folios,
                        "usuario": usuario_raw,
                        "no_encontrado": fila_no_encontrada,
                    }
                )
            else:
                no_encontrados.append(fila_no_encontrada)
            continue

        encontrados_cola.append(
            {
                "idx": idx,
                "alumno_id": alumno_id,
                "row": row,
                "ts": ts,
                "emails": emails,
                "cuentas": cuentas,
                "folios": folios,
            }
        )

    registro = RegistroIdentificadores(
        db, email_map, cuenta_map, folio_map, alumno_details,
        fuente=f"cuestionario:{cuestionario}",
    )

    provisionales = await _crear_provisionales(
        db, sin_registro, cols, periodo, registro,
        email_map, cuenta_map, folio_map, alumno_details,
        encontrados_cola, no_encontrados,
    )

    encontrados_cola.sort(key=lambda e: (ts_sort_key(e["ts"]), e["idx"]))
    vistos: set[int] = set()
    repetidos = 0
    repetidos_detalle: list[dict] = []
    ts_tomado: dict[int, object] = {}
    resultados: list[dict] = []

    for e in encontrados_cola:
        # Se aprenden los datos de todas las filas del alumno, aunque sean repetidas.
        await registro.registrar(
            e["alumno_id"],
            correos=e["emails"],
            cuentas=e["cuentas"],
            folios=e["folios"],
            indice=e["idx"],
        )
        if e["alumno_id"] in vistos:
            repetidos += 1
            info = alumno_details.get(e["alumno_id"], {})
            repetidos_detalle.append(
                {
                    "nombre": info.get("nombre"),
                    "correo": e["emails"][0] if e["emails"] else info.get("correo"),
                    "fecha_tomado": _fecha_desde_ts(ts_tomado.get(e["alumno_id"])),
                    "fecha_ignorado": _fecha_desde_ts(e["ts"]),
                }
            )
            continue
        vistos.add(e["alumno_id"])
        ts_tomado[e["alumno_id"]] = e["ts"]

        aciertos, detalle = calcular_aciertos_cuestionario(
            e["row"], preguntas, respuestas_key, CUESTIONARIO_CODES[cuestionario]
        )
        respuestas_json = json.dumps(detalle, ensure_ascii=False)
        await _upsert_cuestionario(
            db, e["alumno_id"], periodo, cuestionario, aciertos, respuestas_json
        )
        resultados.append(
            _detalle_resultado(alumno_details, e["alumno_id"], aciertos, detalle)
        )

    await db.commit()

    no_encontrados, repetidos_no_enc = deduplicar_primer_intento(no_encontrados)
    repetidos += repetidos_no_enc

    return {
        "cuestionario": cuestionario,
        "periodo": periodo,
        "rango_fechas": rango_fechas_dict(rango),
        "total_filas": len(rows),
        "encontrados": len(resultados),
        "no_encontrados": len(no_encontrados),
        "omitidas_otro_periodo": len(omitidas_detalle),
        "omitidas_detalle": omitidas_detalle,
        "omitidas_periodo_detalle": omitidas_periodo_detalle,
        "intentos_repetidos_ignorados": repetidos,
        "repetidos_detalle": repetidos_detalle,
        "resultados": resultados,
        "no_encontrados_detalle": no_encontrados,
        "alumnos_provisionales_creados": len(provisionales),
        "alumnos_provisionales_detalle": provisionales,
        **registro.resumen(),
    }


async def _crear_provisionales(
    db: AsyncSession,
    sin_registro: list[dict],
    cols: dict,
    periodo: str,
    registro: RegistroIdentificadores,
    email_map: dict[str, int],
    cuenta_map: dict[str, int],
    folio_map: dict[str, int],
    alumno_details: dict[int, dict],
    encontrados_cola: list[dict],
    no_encontrados: list[dict],
) -> list[dict]:
    """Crea un alumno provisional por cada alumno del periodo que no está en el padrón.

    Las filas se recorren de la más antigua a la más nueva; si un alumno tiene
    varias, la primera crea el provisional y las demás ya lo encuentran por sus
    correos/cuenta/folio. Todas pasan a encontrados_cola (ahí se aplica la regla
    del primer intento). Si no se puede crear (sin ingeniería reconocible),
    la fila se queda en no_encontrados como antes.
    """
    if not sin_registro:
        return []

    role_id, ingenierias, ingenieria_ids = await datos_para_provisionales(db)
    creados: list[dict] = []
    sin_registro.sort(key=lambda f: (ts_sort_key(f["ts"]), f["idx"]))

    for f in sin_registro:
        alumno_id = _buscar_por_identificadores(
            f["emails"], f["cuentas"], f["folios"], email_map, cuenta_map, folio_map
        )
        if alumno_id is None:
            clave = clave_ingenieria_fila(
                _valor(f["row"], cols.get("ingenieria")), f["usuario"], ingenierias
            )
            if role_id is None or clave is None:
                f["no_encontrado"]["motivo"] += (
                    "; no se creó provisional (ingeniería no reconocida)"
                )
                no_encontrados.append(f["no_encontrado"])
                continue
            alumno_id = await crear_alumno_provisional(
                db,
                role_id=role_id,
                ingenieria_id=ingenieria_ids[clave],
                ingenieria_clave=clave,
                periodo=normalizar_periodo(periodo) or periodo,
                correo=f["emails"][0],
                lugar_admision=lugar_desde_usuario(f["usuario"]),
                email_map=email_map,
                alumno_details=alumno_details,
            )
            if alumno_id is None:
                f["no_encontrado"]["motivo"] += (
                    "; no se creó provisional (el correo es de otro usuario)"
                )
                no_encontrados.append(f["no_encontrado"])
                continue
            creados.append(
                {
                    "alumno_id": alumno_id,
                    "correo": f["emails"][0],
                    "ingenieria": clave,
                    "indice": f["idx"],
                }
            )
        encontrados_cola.append(
            {
                "idx": f["idx"],
                "alumno_id": alumno_id,
                "row": f["row"],
                "ts": f["ts"],
                "emails": f["emails"],
                "cuentas": f["cuentas"],
                "folios": f["folios"],
            }
        )
        # Se registran ya, para que la siguiente fila del mismo alumno lo encuentre.
        await registro.registrar(
            alumno_id,
            correos=f["emails"],
            cuentas=f["cuentas"],
            folios=f["folios"],
            indice=f["idx"],
        )
    return creados


def _buscar_por_identificadores(
    emails: list[str],
    cuentas: list[str],
    folios: list[str],
    email_map: dict[str, int],
    cuenta_map: dict[str, int],
    folio_map: dict[str, int],
) -> int | None:
    for valor, mapa in (
        *((e, email_map) for e in emails),
        *((c, cuenta_map) for c in cuentas),
        *((f, folio_map) for f in folios),
    ):
        if valor in mapa:
            return mapa[valor]
    return None


async def _tiene_resultado_cuestionario(
    db: AsyncSession,
    alumno_id: int,
    periodo: str,
    cuestionario: int,
) -> bool:
    result = await db.execute(
        select(ResultadoCuestionarioDiagnostico).where(
            ResultadoCuestionarioDiagnostico.alumno_id == alumno_id,
            ResultadoCuestionarioDiagnostico.periodo == periodo,
        )
    )
    row = result.scalars().first()
    if row is None:
        return False
    cols_map = C1_ACIERTOS_COL if cuestionario == 1 else C2_ACIERTOS_COL
    return any(getattr(row, col) is not None for col in cols_map.values())


async def corregir_matching_cuestionario(
    db: AsyncSession,
    file_bytes: bytes,
    cuestionario: int,
    periodo: str,
    correcciones: list[dict],
) -> dict:
    if cuestionario not in (1, 2):
        raise ValueError(f"Cuestionario no válido: {cuestionario}")

    headers, rows = _leer_workbook(file_bytes)
    cols = detectar_columnas_cuestionario(headers)
    preguntas = _filtro_preguntas(cols, cuestionario)
    respuestas_key = _respuestas_key_default()

    rango = await obtener_rango_periodo(db, periodo)

    email_map, cuenta_map, folio_map, alumno_details = await load_all_alumnos(db)

    correction_map = {c["indice"]: c["alumno_id"] for c in correcciones}
    resultados: list[dict] = []
    omitidas_detalle: list[dict] = []
    omitidas_periodo_detalle: list[dict] = []
    periodo_key = normalizar_periodo(periodo) or "".join(str(periodo).upper().split())
    candidatos: dict[int, list[tuple[int, object]]] = {}
    identificadores_fila: dict[int, tuple[list[str], list[str], list[str]]] = {}

    for idx, row in enumerate(rows):
        ts = _obtener_timestamp(row, cols)
        # Misma decisión que en procesar_cuestionario, para aceptar las filas
        # corregidas con la misma regla con que se mostraron.
        emparejado, emails, cuentas, folios = _emparejar_fila(
            row, cols, email_map, cuenta_map, folio_map
        )
        omitida = _decidir_fila(
            idx, row, cols, periodo, rango, emparejado, emails, folios, alumno_details
        )
        if omitida is not None:
            omitidas_detalle.append(omitida)
            info = alumno_details.get(emparejado) if emparejado is not None else None
            registro_periodo = (
                normalizar_periodo(str(info.get("periodo_ingreso") or ""))
                if info
                else None
            )
            if registro_periodo and registro_periodo == periodo_key:
                omitidas_periodo_detalle.append(
                    {
                        "nombre": info["nombre"],
                        "correo": emails[0] if emails else info["correo"],
                        "fecha": _fecha_desde_ts(ts),
                    }
                )
            continue
        if idx not in correction_map:
            continue

        alumno_id = correction_map[idx]
        if alumno_id not in alumno_details:
            continue

        candidatos.setdefault(alumno_id, []).append((idx, ts))
        identificadores_fila[idx] = (emails, cuentas, folios)

    # El administrador confirmó estas filas: sus datos quedan ligados al alumno.
    registro = RegistroIdentificadores(
        db, email_map, cuenta_map, folio_map, alumno_details,
        fuente=f"correccion:cuestionario:{cuestionario}",
    )
    omitidas_ya_tenian_resultado: list[int] = []

    for alumno_id, items in candidatos.items():
        items.sort(key=lambda it: (ts_sort_key(it[1]), it[0]))
        for idx, _ts in items:
            emails, cuentas, folios = identificadores_fila[idx]
            await registro.registrar(
                alumno_id, correos=emails, cuentas=cuentas, folios=folios, indice=idx
            )
        for j, (idx, _ts) in enumerate(items):
            if j > 0:
                omitidas_ya_tenian_resultado.append(idx)
                continue
            if await _tiene_resultado_cuestionario(
                db, alumno_id, periodo, cuestionario
            ):
                omitidas_ya_tenian_resultado.append(idx)
                continue

            row = rows[idx]
            aciertos, detalle = calcular_aciertos_cuestionario(
                row, preguntas, respuestas_key, CUESTIONARIO_CODES[cuestionario]
            )
            respuestas_json = json.dumps(detalle, ensure_ascii=False)
            await _upsert_cuestionario(
                db, alumno_id, periodo, cuestionario, aciertos, respuestas_json
            )
            resultados.append(
                _detalle_resultado(alumno_details, alumno_id, aciertos, detalle)
            )

    await db.commit()

    return {
        "cuestionario": cuestionario,
        "periodo": periodo,
        "total_filas": len(resultados),
        "encontrados": len(resultados),
        "no_encontrados": 0,
        "omitidas_otro_periodo": len(omitidas_detalle),
        "omitidas_detalle": omitidas_detalle,
        "omitidas_periodo_detalle": omitidas_periodo_detalle,
        "intentos_repetidos_ignorados": 0,
        "repetidos_detalle": [],
        "omitidas_ya_tenian_resultado": omitidas_ya_tenian_resultado,
        "resultados": resultados,
        "no_encontrados_detalle": [],
        **registro.resumen(),
    }
