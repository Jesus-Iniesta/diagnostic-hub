import unicodedata

# Dominios mal escritos -> dominio correcto. Solo correcciones explícitas:
# no se usa similitud para no tocar dominios raros pero válidos (gmx.com, uaemex.mx, ...).
DOMINIOS_CORRECTOS: dict[str, str] = {
    # gmail
    "gmai.com": "gmail.com",
    "gmial.com": "gmail.com",
    "gmal.com": "gmail.com",
    "gamil.com": "gmail.com",
    "gmail.co": "gmail.com",
    "gmail.cm": "gmail.com",
    "gmail.om": "gmail.com",
    "gmaill.com": "gmail.com",
    # hotmail
    "hotmial.com": "hotmail.com",
    "hotmai.com": "hotmail.com",
    "hotmal.com": "hotmail.com",
    "hotmail.co": "hotmail.com",
    "hotmail.cm": "hotmail.com",
    # outlook
    "outlook.coom": "outlook.com",
    "outlok.com": "outlook.com",
    "outllok.com": "outlook.com",
    "outlook.co": "outlook.com",
    # icloud
    "icloud.co": "icloud.com",
    "icoud.com": "icloud.com",
    # yahoo
    "yahoo.com.mz": "yahoo.com.mx",
    "yaho.com": "yahoo.com",
    "yahoo.co": "yahoo.com",
}


def normalizar_nombre(raw) -> str:
    """Normaliza un nombre: sin acentos, mayúsculas, sin comas/puntos/dígitos y con las palabras ordenadas."""

    if raw is None:
        return ""
    s = unicodedata.normalize("NFKD", str(raw))
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.upper()
    s = s.replace(",", " ").replace(".", " ")
    s = "".join(" " if c.isdigit() else c for c in s)
    words = [w for w in s.split() if w]
    words.sort()
    if len(words) < 2:
        return ""
    return " ".join(words)


def solo_digitos(raw) -> str | None:
    """Devuelve solo los dígitos del valor, o None si no representan un número."""

    if raw is None or isinstance(raw, bool):
        return None

    if isinstance(raw, int):
        return str(raw)

    if isinstance(raw, float):
        if raw.is_integer():
            return str(int(raw))
        return None

    if isinstance(raw, str):
        s = raw.strip()
        if s in ("", "."):
            return None
        if s.endswith(".0") and s[:-2].isdigit():
            s = s[:-2]
        elif any(c in s for c in "eE") and not s.isdigit():
            value: float | None = None
            try:
                value = float(s)
            except ValueError:
                value = None
            if value is not None:
                if value.is_integer():
                    s = str(int(value))
                else:
                    return None
        digits = "".join(ch for ch in s if ch.isdigit())
        return digits or None

    return solo_digitos(str(raw))


def normalizar_cuenta(raw) -> str | None:
    digits = solo_digitos(raw)
    return digits if digits is not None and len(digits) == 7 else None


def normalizar_folio(raw) -> str | None:
    digits = solo_digitos(raw)
    return digits if digits is not None and len(digits) == 9 else None


def clasificar_identificador(raw) -> tuple[str | None, str | None]:
    if isinstance(raw, str) and "@" in raw:
        return "correo", None
    digits = solo_digitos(raw)
    if digits is None:
        return None, None
    if len(digits) == 7:
        return "cuenta", digits
    if len(digits) == 9:
        return "folio", digits
    return None, None


def normalizar_correo(raw) -> str | None:
    """Normaliza un correo para emparejar alumnos entre archivos.

    Minúsculas, sin espacios, quita el "@dominio" extra que agrega WebAssign
    (correo@gmail.com@uaemex.mx), corrige ".con" y dominios mal escritos.
    Devuelve None si el valor no parece un correo.
    """

    if raw is None:
        return None
    s = "".join(str(raw).lower().split())
    if "@" not in s:
        return None
    if s.count("@") > 1:
        s = s.rsplit("@", 1)[0]
    if s.count("@") != 1:
        return None
    usuario, dominio = s.split("@")
    if not usuario or not dominio:
        return None
    if dominio.endswith(".con"):
        dominio = dominio[:-4] + ".com"
    dominio = DOMINIOS_CORRECTOS.get(dominio, dominio)
    return f"{usuario}@{dominio}"
