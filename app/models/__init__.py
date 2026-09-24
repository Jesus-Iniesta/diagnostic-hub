from app.models.role_permission import role_permissions

from app.models.permission import Permission
from app.models.role import Role
from app.models.user import AuthMethod, User

from app.models.ingenieria import Ingenieria
from app.models.materia import Materia
from app.models.alumno import Alumno
from app.models.configuracion import Configuracion
from app.models.examen import Examen
from app.models.modulo import Modulo
from app.models.pregunta import Pregunta
from app.models.asignacion_examen import AsignacionExamen
from app.models.intento_presentacion import IntentoPresentacion
from app.models.asignacion_modulo import AsignacionModulo
from app.models.feedback_resultado import FeedbackResultado
from app.models.resultado_diagnostico import ResultadoDiagnostico
from app.models.respuesta_correcta_diagnostico import RespuestaCorrectaDiagnostico
from app.models.liga_examen_diagnostico import LigaExamenDiagnostico
from app.models.resultado_webassign import ResultadoWebAssign
from app.models.resultado_cuestionario_diagnostico import (
    ResultadoCuestionarioDiagnostico,
)
from app.models.grupo import Grupo
from app.models.grupo_profesor import grupo_profesor
from app.models.grupo_alumno import grupo_alumno

__all__ = [
    "role_permissions",
    "Permission",
    "Role",
    "AuthMethod",
    "User",
    "Ingenieria",
    "Materia",
    "Alumno",
    "Configuracion",
    "Examen",
    "Modulo",
    "Pregunta",
    "AsignacionExamen",
    "IntentoPresentacion",
    "AsignacionModulo",
    "FeedbackResultado",
    "ResultadoDiagnostico",
    "RespuestaCorrectaDiagnostico",
    "LigaExamenDiagnostico",
    "ResultadoWebAssign",
    "ResultadoCuestionarioDiagnostico",
    "Grupo",
    "grupo_profesor",
    "grupo_alumno",
]