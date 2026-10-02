import asyncio
import io
import logging
from types import SimpleNamespace
from unittest.mock import patch

import openpyxl

from app.services import upload_alumnos_service as alumnos_svc
from app.services.upload_diagnostico_service import load_all_alumnos


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def __iter__(self):
        return iter(self._rows)

    def all(self):
        return list(self._rows)


class FakeSession:
    """Sesión mínima: cada execute() devuelve el siguiente resultado de la lista."""

    def __init__(self, resultados):
        self._resultados = list(resultados)
        self.agregados = []
        self.commits = 0

    async def execute(self, _stmt):
        return FakeResult(self._resultados.pop(0))

    def add(self, obj):
        self.agregados.append(obj)

    async def flush(self):
        pass

    async def commit(self):
        self.commits += 1


def _excel_alumno(correo: str) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append([f"col{i}" for i in range(30)])
    fila = [None] * 30
    fila[alumnos_svc.COL_NOMBRE] = "Juan"
    fila[alumnos_svc.COL_APELLIDO_PATERNO] = "Perez"
    fila[alumnos_svc.COL_APELLIDO_MATERNO] = "Lopez"
    fila[alumnos_svc.COL_CORREO_PERSONAL] = correo
    fila[alumnos_svc.COL_NUMERO_CUENTA] = "2221316"
    fila[alumnos_svc.COL_INGENIERIA] = "Ingeniería en Computación (ICO)"
    fila[alumnos_svc.COL_PERIODO] = "2025B"
    ws.append(fila)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def test_resubir_alumno_con_dominio_mal_escrito_es_duplicado():
    # En BD: correo guardado con dominio mal escrito y otra cuenta, para que solo el correo dispare el duplicado.
    db = FakeSession([
        [("9999999",)],          # cuentas existentes
        [],                      # folios existentes
        [("x@gmial.com",)],      # correos existentes (crudos)
    ])
    rol = SimpleNamespace(id=1)

    async def fake_roles(_db):
        return rol, {"ICO": 1}

    with patch.object(alumnos_svc, "_get_role_and_ingenierias", fake_roles):
        resultado = asyncio.run(alumnos_svc.procesar_excel(db, _excel_alumno("x@gmail.com")))

    assert resultado.duplicados == 1, resultado
    assert resultado.exitosos == 0
    fila = resultado.detalle[0]
    assert fila.estado == "duplicado"
    assert "x@gmail.com" in fila.motivo
    assert db.agregados == []


def test_resubir_correccion_con_dominio_mal_escrito_es_duplicado():
    db = FakeSession([[("9999999",)], [], [("x@gmial.com",)]])
    rol = SimpleNamespace(id=1)

    async def fake_roles(_db):
        return rol, {"ICO": 1}

    fila = {
        "fila": 2,
        "datos": {
            "nombre": "Juan",
            "apellido_paterno": "Perez",
            "apellido_materno": "Lopez",
            "correo_personal": "X@Gmail.com",
            "numero_cuenta": "2221316",
            "ingenieria": "ICO",
            "periodo": "2025B",
        },
    }
    with patch.object(alumnos_svc, "_get_role_and_ingenierias", fake_roles):
        resultado = asyncio.run(alumnos_svc.procesar_correcciones(db, [fila]))

    assert resultado.duplicados == 1, resultado
    assert resultado.detalle[0].estado == "duplicado"


class _CapturaLogs(logging.Handler):
    def __init__(self):
        super().__init__(logging.WARNING)
        self.mensajes: list[str] = []

    def emit(self, record):
        self.mensajes.append(record.getMessage())


def _fila_bd(alumno_id, correo_personal, correo_inst=None):
    alumno = SimpleNamespace(
        id=alumno_id, numero_cuenta=None, numero_folio=None,
        ingenieria=None, periodo_ingreso="2025B",
    )
    user = SimpleNamespace(
        nombre="N", apellido_paterno="P", apellido_materno="M",
        correo_personal=correo_personal, correo_institucional=correo_inst,
    )
    return alumno, user


def test_load_all_alumnos_correos_que_normalizan_igual():
    db = FakeSession([[
        _fila_bd(10, "x@gmail.com"),
        _fila_bd(20, "X@Gmial.com"),
        # mismo alumno con personal e institucional iguales: no debe avisar
        _fila_bd(30, "y@uaemex.mx", "Y@uaemex.mx"),
    ]])
    logger = logging.getLogger("app.services.upload_diagnostico_service")
    captura = _CapturaLogs()
    logger.addHandler(captura)
    try:
        email_map, _, _, detalles = asyncio.run(load_all_alumnos(db))
    finally:
        logger.removeHandler(captura)

    assert email_map["x@gmail.com"] == 10
    assert email_map["y@uaemex.mx"] == 30
    assert set(detalles) == {10, 20, 30}
    assert len(captura.mensajes) == 1, captura.mensajes
    assert "10" in captura.mensajes[0] and "20" in captura.mensajes[0]


if __name__ == "__main__":
    for nombre, fn in list(globals().items()):
        if nombre.startswith("test_") and callable(fn):
            fn()
            print(f"ok  {nombre}")
    print("\nTODAS LAS PRUEBAS PASARON")
