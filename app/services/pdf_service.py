import io
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def generar_pdf_correo(
    nombre_completo: str,
    numero_cuenta: str | None,
    correo_personal: str | None,
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
    c.drawString(3 * cm, y, correo_personal or "—")
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


PRIMARY = colors.HexColor("#1C1954")
ACCENT = colors.HexColor("#4F46E5")
LIGHT_FILL = colors.HexColor("#F5F6FA")
LIGHT_ACCENT = colors.HexColor("#E8EAF6")
BORDER = colors.HexColor("#D8DAE3")


def _fmt_calif(valor: float | None, sin_label: str = "Sin datos") -> str:
    if valor is None:
        return sin_label
    return f"{valor:.2f}"


def _fmt_trabajo(valor: float | None) -> str:
    if valor is None or valor <= 0:
        return "No trabajó"
    return f"{valor:.2f}"


def _fmt_aciertos(valor: int | None) -> str:
    return "—" if valor is None else f"{valor} / 10"


def _fmt_valor(valor: float) -> str:
    """Valor configurado por el coordinador: 10 -> '10', 2.5 -> '2.5'."""
    return f"{valor:.2f}".rstrip("0").rstrip(".")


def _texto_parrafo(texto: str) -> str:
    """Escapa el texto libre del coordinador para Paragraph y respeta sus saltos de línea."""
    return escape(texto.strip()).replace("\n", "<br/>")


# Tamaños compactos para que la carta quepa en una hoja.
TABLA_FONT = 9
TABLA_PADDING = 3


def _estilo_tabla(extra: list | None = None) -> TableStyle:
    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), TABLA_FONT),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_FILL]),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), TABLA_PADDING),
        ("BOTTOMPADDING", (0, 0), (-1, -1), TABLA_PADDING),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        *(extra or []),
    ])


def _tabla(rows: list[list[str]], anchos_cm: list[float], extra: list | None = None) -> Table:
    t = Table(rows, colWidths=[a * cm for a in anchos_cm], hAlign="LEFT")
    t.setStyle(_estilo_tabla(extra))
    return t


def generar_pdf_resultado(
    nombre_completo: str,
    numero_cuenta: str | None,
    ingenieria: str | None,
    periodo: str | None,
    diagnostico: list[dict] | None,
    examen_final: list[dict] | None,
    webassign: list[dict] | None,
    indice: dict,
) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        title="Carta de recomendación",
        rightMargin=1.8 * cm,
        leftMargin=1.8 * cm,
        topMargin=1.4 * cm,
        bottomMargin=1.4 * cm,
    )

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle(
        "Titulo", parent=styles["Title"], fontSize=18, textColor=PRIMARY,
        spaceAfter=4, leading=22,
    )
    h2 = ParagraphStyle(
        "Seccion", parent=styles["Heading2"], fontSize=11.5, textColor=PRIMARY,
        spaceBefore=8, spaceAfter=4, leading=14,
    )
    normal = ParagraphStyle(
        "Normal", parent=styles["Normal"], fontSize=9.5, leading=12,
        textColor=colors.HexColor("#333333"),
    )
    encabezado = ParagraphStyle(
        "Encabezado", parent=normal, fontSize=10, leading=13, alignment=1,
    )
    categoria_style = ParagraphStyle(
        "Categoria", parent=normal, fontSize=11, leading=14, textColor=PRIMARY,
        spaceBefore=10, spaceAfter=4,
    )
    leyenda = ParagraphStyle(
        "Leyenda", parent=normal, fontSize=9.5, leading=13,
        backColor=LIGHT_ACCENT,
        borderPadding=8,
        borderColor=colors.HexColor("#BFC3F2"),
        borderWidth=0.7,
        borderRadius=6,
    )

    story = []

    # a) Encabezado en dos líneas.
    story.append(Paragraph("Carta de recomendación", h1))
    linea1 = f"<b>{escape(nombre_completo)}</b>"
    if numero_cuenta:
        linea1 += f" · No. de cuenta {escape(numero_cuenta)}"
    linea2 = " · ".join(
        p for p in (escape(ingenieria) if ingenieria else None, f"Periodo {periodo}" if periodo else None)
        if p
    )
    story.append(Paragraph(linea1, encabezado))
    if linea2:
        story.append(Paragraph(linea2, encabezado))

    # b) Examen diagnóstico (cuestionarios 1 y 2).
    story.append(Paragraph("Examen diagnóstico", h2))
    if diagnostico:
        rows = [["Materia", "Cuestionario 1", "Cuestionario 2", "Calificación"]]
        for m in diagnostico:
            rows.append([
                m["nombre"],
                _fmt_aciertos(m["c1"]),
                _fmt_aciertos(m["c2"]),
                "—" if m["calificacion"] is None else f"{m['calificacion']:.1f}",
            ])
        story.append(_tabla(rows, [6, 3.5, 3.5, 3]))
    else:
        story.append(Paragraph("No tienes examen diagnóstico registrado.", normal))

    # c) Examen final.
    story.append(Paragraph("Examen final", h2))
    if examen_final:
        rows = [["Materia", "Calificación"]]
        for m in examen_final:
            rows.append([m["nombre"], _fmt_calif(m["puntaje"])])
        story.append(_tabla(rows, [6, 3]))
    else:
        story.append(Paragraph("No tienes examen final registrado.", normal))

    # d) WebAssign.
    story.append(Paragraph("WebAssign", h2))
    if webassign:
        rows = [["Materia", "Trabajo", "Examen"]]
        for m in webassign:
            rows.append([m["nombre"], _fmt_trabajo(m["trabajo"]), _fmt_trabajo(m["examen"])])
        story.append(_tabla(rows, [6, 3, 3]))
    else:
        story.append(Paragraph("No trabajaste en WebAssign.", normal))

    # e) Índice FI UAEMex.
    story.append(Paragraph("Índice FI UAEMex", h2))
    story.append(_tabla_desglose_indice(indice))

    # f) Categoría y su comentario.
    categoria = indice["categoria"]
    if categoria:
        story.append(Paragraph(f"<b>Categoría: {escape(categoria['nombre'])}</b>", categoria_style))
        if categoria["comentario"].strip():
            story.append(Spacer(1, 4))
            story.append(Paragraph(_texto_parrafo(categoria["comentario"]), leyenda))

    doc.build(story)
    return buf.getvalue()


def _tabla_desglose_indice(indice: dict) -> Table:
    """Componente | obtenido | valor; el detalle por materia ya salió en las tablas de arriba."""
    rows = [["Componente", "Obtenido", "Valor"]]
    if indice["asistencia"]["usar"]:
        rows.append(["Asistencia", "Sin registrar", _fmt_valor(indice["asistencia"]["valor"])])
    for nombre, key in (
        ("Examen diagnóstico", "diagnostico"),
        ("WebAssign", "webassign"),
        ("Examen final", "final"),
    ):
        comp = indice[key]
        rows.append([nombre, f"{comp['total']:.2f}", _fmt_valor(comp["valor"])])

    total = len(rows)
    rows.append([
        f"Índice FI UAEMex: {indice['indice']:.1f} / {_fmt_valor(indice['maximo'])}", "", "",
    ])
    return _tabla(rows, [6, 3, 3], [
        ("SPAN", (0, total), (-1, total)),
        ("ALIGN", (0, total), (-1, total), "LEFT"),
        ("BACKGROUND", (0, total), (-1, total), LIGHT_ACCENT),
        ("FONTNAME", (0, total), (-1, total), "Helvetica-Bold"),
        ("FONTSIZE", (0, total), (-1, total), 10),
    ])
