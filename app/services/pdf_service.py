import io

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas


def generar_pdf_correo(
    nombre_completo: str,
    numero_cuenta: str | None,
    correo_personal: str,
    correo_institucional: str | None,
) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    _width, height = letter

    y = height - 2 * cm

    c.setFont("Helvetica-Bold", 20)
    c.drawString(2 * cm, y, "TutoNet")
    y -= 0.8 * cm

    c.setFont("Helvetica", 12)
    c.drawString(2 * cm, y, "Datos de correo del alumno")
    y -= 1.5 * cm

    if numero_cuenta:
        c.setFont("Helvetica-Bold", 12)
        c.drawString(2 * cm, y, "No. de cuenta:")
        c.setFont("Helvetica", 12)
        c.drawString(5 * cm, y, numero_cuenta)
        y -= 0.8 * cm

    y -= 0.5 * cm
    c.setFont("Helvetica-Bold", 12)
    c.drawString(2 * cm, y, "Correo personal (WebAssign):")
    y -= 0.7 * cm
    c.setFont("Helvetica", 11)
    c.drawString(3 * cm, y, correo_personal)
    y -= 1.2 * cm

    c.setFont("Helvetica-Bold", 12)
    c.drawString(2 * cm, y, "Correo institucional:")
    y -= 0.7 * cm

    if correo_institucional:
        c.setFont("Helvetica", 11)
        c.drawString(3 * cm, y, correo_institucional)
    else:
        c.setFont("Helvetica", 11)
        c.setFillColorRGB(0.8, 0.4, 0)
        c.drawString(
            3 * cm,
            y,
            "No registrado. Por favor registra tu correo institucional",
        )
        y -= 0.6 * cm
        c.drawString(
            3 * cm,
            y,
            'en la seccion "Mis datos de contacto".',
        )
        c.setFillColorRGB(0, 0, 0)

    c.save()
    return buf.getvalue()
