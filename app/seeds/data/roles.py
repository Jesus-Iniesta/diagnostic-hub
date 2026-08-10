ROLES = [
    {
        "name": "administrador",
        "description": "Administrador con control total del sistema",
        "permissions": [
            "administrar_sistema",
            "cargar_excel",
            "definir_rangos",
            "generar_reporte",
            "descargar_archivo_final",
            "consultar_estadisticas",
            "consultar_resultados_grupo",
            "consultar_mis_resultados",
        ],
    },
    {
        "name": "profesor",
        "description": "Consulta únicamente los alumnos de su grupo",
        "permissions": [
            "consultar_resultados_grupo",
        ],
    },
    {
        "name": "acreditador",
        "description": "Consulta información y estadísticas (solo lectura)",
        "permissions": [
            "consultar_estadisticas",
            "generar_reporte",
        ],
    },
    {
        "name": "alumno",
        "description": "Consulta sus propios resultados",
        "permissions": [
            "consultar_mis_resultados",
        ],
    },
]