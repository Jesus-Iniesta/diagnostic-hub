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