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

MATERIAS_INDICE = {
    "algebra": "Álgebra",
    "trigonometria": "Trigonometría",
    "geometria": "Geometría Analítica",
    "calculo": "Cálculo Diferencial",
}


def _fmt_calif(valor: float | None, sin_label: str = "Sin datos") -> str:
    if valor is None:
        return sin_label
    return f"{valor:.2f}"


def _fmt_trabajo(valor: float | None) -> str:
    if valor is None or valor <= 0:
        return "No trabajó"
    return f"{valor:.2f}"


def generar_pdf_resultado(
    nombre_completo: str,
    numero_cuenta: str | None,
    periodo: str | None,
    diagnostico: dict | None,
    webassign: dict | None,
    indice: dict,
) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        title="Carta de recomendación",
        rightMargin=1.8 * cm,
        leftMargin=1.8 * cm,
        topMargin=1.6 * cm,
        bottomMargin=1.6 * cm,
    )

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle(
        "Titulo", parent=styles["Title"], fontSize=22, textColor=PRIMARY,
        spaceAfter=4, leading=26,
    )
    h2 = ParagraphStyle(
        "Seccion", parent=styles["Heading2"], fontSize=13, textColor=PRIMARY,
        spaceBefore=14, spaceAfter=6, leading=16,
    )
    normal = ParagraphStyle(
        "Normal", parent=styles["Normal"], fontSize=10.5, leading=14,
        textColor=colors.HexColor("#333333"),
    )
    small = ParagraphStyle(
        "Small", parent=styles["Normal"], fontSize=9.5, leading=12,
        textColor=colors.HexColor("#667085"),
    )
    leyenda = ParagraphStyle(
        "Leyenda", parent=styles["Normal"], fontSize=10.5, leading=15,
        textColor=colors.HexColor("#333333"),
        backColor=LIGHT_ACCENT,
        borderPadding=10,
        borderColor=colors.HexColor("#BFC3F2"),
        borderWidth=0.7,
        borderRadius=6,
    )

    story = []

    story.append(Paragraph("Carta de recomendación", h1))
    story.append(Paragraph("TutoNet · Resultados de nivelación", small))
    if periodo:
        story.append(Paragraph(f"Periodo {periodo}", small))
    story.append(Spacer(1, 8))

    datos = [["Alumno", nombre_completo]]
    if numero_cuenta:
        datos.append(["No. de cuenta", numero_cuenta])
    datos_table = Table(datos, colWidths=[3.5 * cm, 12.5 * cm])
    datos_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10.5),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#333333")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(datos_table)
    story.append(Spacer(1, 10))

    tabla_style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_FILL]),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
    ])

    if diagnostico:
        story.append(Paragraph("Examen diagnóstico", h2))
        rows = [["Área", "Calificación"]]
        for m in diagnostico["materias"]:
            rows.append([m["nombre"], _fmt_calif(m["puntaje"])])
        rows.append(["Promedio", _fmt_calif(diagnostico["promedio"])])
        t = Table(rows, colWidths=[10 * cm, 6 * cm])
        t.setStyle(tabla_style)
        story.append(t)
    else:
        story.append(Paragraph("Examen diagnóstico", h2))
        story.append(Paragraph(
            "No tienes examen diagnóstico registrado. Al realizarlo podrás "
            "ver tu calificación por área aquí.",
            normal,
        ))

    if webassign:
        story.append(Paragraph("WebAssign", h2))
        wa_rows = [["Área", "Trabajo", "Examen"]]
        for m in webassign["materias"]:
            wa_rows.append([
                m["nombre"],
                _fmt_trabajo(m["trabajo"]),
                _fmt_trabajo(m["examen"]),
            ])
        wa_rows.append([
            "Promedio",
            _fmt_calif(webassign["promedio"], sin_label="No trabajó"),
            "",
        ])
        wa_table = Table(wa_rows, colWidths=[7 * cm, 4.5 * cm, 4.5 * cm])
        wa_table.setStyle(tabla_style)
        story.append(wa_table)
    else:
        story.append(Paragraph("WebAssign", h2))
        story.append(Paragraph(
            "No trabajaste en WebAssign. Realiza las actividades para "
            "complementar tu resultado final.",
            normal,
        ))

    story.append(Paragraph("Índice FI UAEMex", h2))
    categoria = indice["categoria"]
    final_rows = [[
        "Índice FI UAEMex",
        f"{indice['indice']:.1f} / {_fmt_valor(indice['maximo'])}",
        categoria["nombre"] if categoria else "",
    ]]
    final_table = Table(final_rows, colWidths=[6 * cm, 4 * cm, 6 * cm])
    final_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("ALIGN", (1, 0), (-1, 0), "CENTER"),
    ]))
    story.append(final_table)
    if categoria and categoria["comentario"].strip():
        story.append(Spacer(1, 10))
        story.append(Paragraph(_texto_parrafo(categoria["comentario"]), leyenda))

    story.append(Spacer(1, 12))
    story.append(_tabla_desglose_indice(indice))

    doc.build(story)
    return buf.getvalue()


def _fmt_valor(valor: float) -> str:
    """Valor configurado por el coordinador: 10 -> '10', 2.5 -> '2.5'."""
    return f"{valor:.2f}".rstrip("0").rstrip(".")


def _texto_parrafo(texto: str) -> str:
    """Escapa el texto libre del coordinador para Paragraph y respeta sus saltos de línea."""
    return escape(texto.strip()).replace("\n", "<br/>")


def _tabla_desglose_indice(indice: dict) -> Table:
    diag = indice["diagnostico"]
    wa = indice["webassign"]
    final = indice["final"]

    rows = [["Componente", "Obtenido", "Valor"]]
    subfilas: list[int] = []
    totales: list[int] = []

    def componente(nombre: str, obtenido: str, valor: float) -> None:
        totales.append(len(rows))
        rows.append([nombre, obtenido, _fmt_valor(valor)])

    def detalle(nombre: str, obtenido: float, valor: float) -> None:
        subfilas.append(len(rows))
        rows.append([f"    {nombre}", f"{obtenido:.2f}", _fmt_valor(valor)])

    componente("Asistencia", "Sin registrar", indice["asistencia"]["valor"])

    componente("Examen diagnóstico", f"{diag['total']:.2f}", diag["valor"])
    detalle("Cuestionario 1", diag["c1"]["total"], diag["valor"] / 2)
    detalle("Cuestionario 2", diag["c2"]["total"], diag["valor"] / 2)

    componente("WebAssign", f"{wa['total']:.2f}", wa["valor"])
    for key, m in wa["materias"].items():
        detalle(MATERIAS_INDICE[key], m["total"], wa["valor"] / 3)

    componente("Examen final", f"{final['total']:.2f}", final["valor"])
    for key, obtenido in final["materias"].items():
        detalle(MATERIAS_INDICE[key], obtenido, final["valor"] / 4)

    total_row = len(rows)
    rows.append([
        "Índice FI UAEMex",
        f"{indice['indice']:.1f}",
        _fmt_valor(indice["maximo"]),
    ])

    estilo = [
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("BACKGROUND", (0, total_row), (-1, total_row), LIGHT_ACCENT),
        ("FONTNAME", (0, total_row), (-1, total_row), "Helvetica-Bold"),
    ]
    for r in totales:
        estilo.append(("FONTNAME", (0, r), (-1, r), "Helvetica-Bold"))
        estilo.append(("BACKGROUND", (0, r), (-1, r), LIGHT_FILL))
    for r in subfilas:
        estilo.append(("TEXTCOLOR", (0, r), (-1, r), colors.HexColor("#555555")))

    t = Table(rows, colWidths=[8 * cm, 4 * cm, 4 * cm])
    t.setStyle(TableStyle(estilo))
    return t
