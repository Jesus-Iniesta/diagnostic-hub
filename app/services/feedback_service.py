from __future__ import annotations


MATERIAS_NOMBRES: dict[str, str] = {
    "algebra": "Álgebra",
    "trigonometria": "Trigonometría",
    "geometria": "Geometría Analítica",
    "calculo": "Cálculo Diferencial",
}

MAXIMO_PUNTAJE = 10.0


def _nivel(puntaje: float) -> str:
    if puntaje >= 9:
        return "Alto"
    if puntaje >= 7:
        return "Bueno"
    if puntaje >= 4.5:
        return "Medio"
    if puntaje >= 2.5:
        return "Bajo"
    return "Muy bajo"


def feedback_materia(materia: str, puntaje: float) -> tuple[str, str]:
    nivel = _nivel(puntaje)
    nombre = MATERIAS_NOMBRES.get(materia, materia)

    mensajes = {
        "Alto": (
            f"¡Excelente desempeño en {nombre}! "
            "Dominas los fundamentos de este tema. "
            "Continúa así y reta temas avanzados para seguir creciendo."
        ),
        "Bueno": (
            f"Buen desempeño en {nombre}. "
            "Tienes una base sólida; reforzando algunos temas puntuales "
            "puedes alcanzar un nivel sobresaliente."
        ),
        "Medio": (
            f"En {nombre} hay áreas que necesitan refuerzo. "
            "Te recomienda practicar ejercicios de las secciones donde "
            "te Costó más y buscar apoyo en tus profesores."
        ),
        "Bajo": (
            f"{nombre} requiere más atención. "
            "No te desanimes, es un tema que se mejora con práctica constante. "
            "Dedica tiempo a los temas básicos y busca recursos de apoyo."
        ),
        "Muy bajo": (
            f"Este es un buen punto de partida en {nombre}. "
            "Todos empezamos de algún lado. Te animo a que dediques "
            "tiempo regular al estudio y no tengas miedo de preguntar."
        ),
    }
    return nivel, mensajes[nivel]


def feedback_general(
    promedio: float | None,
    niveles: list[str],
) -> tuple[str, str]:
    if promedio is None:
        return "Sin datos", "Aún no tienes resultados registrados."

    nivel = _nivel(promedio)
    alto_count = niveles.count("Alto")
    bajo_count = niveles.count("Bajo") + niveles.count("Muy bajo")

    if nivel == "Alto":
        texto = (
            "¡Felicidades! Tu rendimiento general es sobresaliente. "
            "Demuestras un dominio sólido de las matemáticas de nivelación. "
            "Sigue manteniendo ese nivel y desafiándote con temas más avanzados."
        )
    elif nivel == "Bueno":
        if alto_count >= 2:
            texto = (
                "Buen rendimiento general. Destacas en varias materias, "
                "lo que indica un buen potencial. Reforzando las áreas "
                "pendientes puedes alcanzar un nivel excelente."
            )
        else:
            texto = (
                "Tu rendimiento es satisfactorio. Tienes bases que construir "
                "sobre ellas. Con un poco más de práctica en las materias "
                "más débiles, verás grandes mejoras."
            )
    elif nivel == "Medio":
        if bajo_count >= 2:
            texto = (
                "Tu rendimiento indica que hay varias áreas por reforzar. "
                "No te preocupes, es completamente normal al inicio. "
                "Te recomiendo enfocarte en una materia a la vez y "
                "buscar apoyo con tus profesores o compañeros."
            )
        else:
            texto = (
                "Nivel intermedio. Algunas materias van bien pero otras "
                "necesitan atención. Dedica tiempo de estudio equilibrado "
                "y verás progreso rápido."
            )
    elif nivel == "Bajo":
        texto = (
            "El rendimiento general indica que necesitas reforzar "
            "las bases matemáticas. No te desanimes: con constancia "
            "y apoyo, es posible mejorar significativamente. "
            "Te sugiero buscar tutorías y practicar diariamente."
        )
    else:
        texto = (
            "Es un comienzo, y todos los grandes logros empiezan así. "
            "Te animo a que dediques tiempo regular al estudio, "
            "no tengas miedo de preguntar y busques el apoyo que necesites. "
            "El esfuerzo constante siempre da frutos."
        )

    return nivel, texto


def nivel_puntaje(puntaje: float) -> str:
    return _nivel(puntaje)


def feedback_final(
    promedio_final: float | None,
    tiene_diag: bool,
    tiene_wa: bool,
) -> tuple[str, str]:
    if promedio_final is None:
        return (
            "Sin datos",
            "Aún no hay resultados registrados para tu resultado final. "
            "Cuando realices el examen diagnóstico y las actividades de "
            "WebAssign podrás ver tu reporte completo.",
        )

    if promedio_final <= 0:
        return (
            "Sin registro",
            "No se registró trabajo: tu promedio general es 0. "
            "Te invitamos a realizar el examen diagnóstico y las "
            "actividades de WebAssign; al completarlos verás tu "
            "desempeño reflejado aquí.",
        )

    nivel = _nivel(promedio_final)

    if not tiene_diag:
        texto = (
            f"Tu promedio final es {promedio_final:.2f}, basado solo en WebAssign, "
            "ya que aún no tienes examen diagnóstico registrado. "
            "Completa el diagnóstico para tener un panorama completo."
        )
    elif not tiene_wa:
        texto = (
            f"Tu promedio final es {promedio_final:.2f}, basado solo en el examen "
            "diagnóstico. Falta que trabajes tus actividades de WebAssign "
            "para complementar tu resultado."
        )
    elif nivel == "Alto":
        texto = (
            "¡Felicidades! Tu resultado final es sobresaliente. "
            "Dominas las matemáticas de nivelación y tu trabajo en "
            "WebAssign es consistente. Sigue así y reta temas "
            "más avanzados."
        )
    elif nivel == "Bueno":
        texto = (
            "Buen resultado final. Tienes una base sólida en el "
            "diagnóstico y en WebAssign. Refuerza las áreas con menor "
            "puntaje para alcanzar un nivel excelente."
        )
    elif nivel == "Medio":
        texto = (
            "Tu resultado final muestra áreas por reforzar tanto en el "
            "diagnóstico como en WebAssign. No te desanimes: te "
            "recomendamos practicar con constancia y buscar apoyo de "
            "tus profesores."
        )
    elif nivel == "Bajo":
        texto = (
            "Tu promedio final indica que necesitas reforzar las bases "
            "matemáticas y tu participación en WebAssign. Con práctica "
            "diaria y tutorías puedes mejorar considerablemente."
        )
    else:
        texto = (
            "Es un buen punto de partida: todos los grandes logros "
            "empiezan así. Invierte tiempo regular en las actividades "
            "del diagnóstico y de WebAssign, y verás cómo tu resultado "
            "mejora con el esfuerzo constante."
        )

    return nivel, texto
