import xlrd


def parse_profesor_excel(contents: bytes, filename: str) -> tuple[list[dict], list[str]]:
    """
    Parse the professor's Excel file.

    Expected columns:
    0: CUENTA, 1: APELLIDO PATERNO, 2: APELLIDO MATERNO,
    3: NOMBRE, 4: PLAN DE ESTUDIOS, 5: ORGANISMO,
    6: CORREO INSTITUCIONAL, 7: ESTADO DEL ALUMNO

    Returns: (alumnos_data, errores)
    """
    errores = []
    alumnos = []

    try:
        wb = xlrd.open_workbook(file_contents=contents)
        ws = wb.sheet_by_index(0)
    except (xlrd.XLRDError, IndexError) as e:
        return [], [f"No se pudo abrir el archivo: {e}"]

    if ws.nrows < 2:
        return [], ["El archivo está vacío o no tiene datos"]

    headers = [str(ws.cell_value(0, c)).strip().upper() for c in range(ws.ncols)]
    expected = ["CUENTA", "APELLIDO PATERNO", "APELLIDO MATERNO", "NOMBRE"]
    for exp in expected:
        if exp not in headers:
            return [], [f"Falta la columna esperada: {exp}"]

    has_plan = "PLAN DE ESTUDIOS" in headers
    has_correo = "CORREO INSTITUCIONAL" in headers
    plan_idx = headers.index("PLAN DE ESTUDIOS") if has_plan else None
    correo_idx = headers.index("CORREO INSTITUCIONAL") if has_correo else None

    for row_idx in range(1, ws.nrows):
        try:
            cuenta = str(ws.cell_value(row_idx, 0)).strip()
            if not cuenta or cuenta == "0":
                continue

            cuenta = cuenta.removesuffix(".0")

            apellido_paterno = str(ws.cell_value(row_idx, 1)).strip()
            apellido_materno = str(ws.cell_value(row_idx, 2)).strip()
            nombre = str(ws.cell_value(row_idx, 3)).strip()

            if not all([cuenta, apellido_paterno, apellido_materno, nombre]):
                errores.append(f"Fila {row_idx + 1}: Campos vacíos")
                continue

            plan_estudios = None
            if plan_idx is not None:
                plan_raw = str(ws.cell_value(row_idx, plan_idx)).strip()
                if plan_raw and plan_raw != "0.0":
                    plan_estudios = plan_raw

            correo_institucional = None
            if correo_idx is not None:
                correo_raw = str(ws.cell_value(row_idx, correo_idx)).strip()
                if correo_raw and correo_raw != "0.0" and "@" in correo_raw:
                    correo_institucional = correo_raw

            alumnos.append({
                "numero_cuenta": cuenta,
                "apellido_paterno": apellido_paterno,
                "apellido_materno": apellido_materno,
                "nombre": nombre,
                "plan_estudios": plan_estudios,
                "correo_institucional": correo_institucional,
            })
        except (ValueError, IndexError) as e:
            errores.append(f"Fila {row_idx + 1}: Error al procesar - {e}")

    return alumnos, errores
