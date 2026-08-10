from app.schemas.alumno import AlumnoCreate, AlumnoRead, AlumnoUpdate
from app.schemas.auth import NumeroCuentaLogin, Token
from app.schemas.asignacion_examen import (
    AsignacionExamenCreate,
    AsignacionExamenRead,
    AsignacionExamenUpdate,
)
from app.schemas.asignacion_modulo import (
    AsignacionModuloCreate,
    AsignacionModuloRead,
    AsignacionModuloUpdate,
)
from app.schemas.examen import ExamenCreate, ExamenRead, ExamenUpdate
from app.schemas.feedback_resultado import (
    FeedbackResultadoCreate,
    FeedbackResultadoRead,
    FeedbackResultadoUpdate,
)
from app.schemas.ingenieria import IngenieriaCreate, IngenieriaRead, IngenieriaUpdate
from app.schemas.intento_presentacion import (
    IntentoPresentacionCreate,
    IntentoPresentacionRead,
    IntentoPresentacionUpdate,
)
from app.schemas.modulo import ModuloCreate, ModuloRead, ModuloUpdate
from app.schemas.permission import PermissionCreate, PermissionRead, PermissionUpdate
from app.schemas.pregunta import PreguntaCreate, PreguntaRead, PreguntaUpdate
from app.schemas.role import RoleCreate, RoleRead, RoleUpdate
from app.schemas.user import UserCreate, UserRead, UserUpdate

__all__ = [
    "AlumnoCreate",
    "AlumnoRead",
    "AlumnoUpdate",
    "AsignacionExamenCreate",
    "AsignacionExamenRead",
    "AsignacionExamenUpdate",
    "AsignacionModuloCreate",
    "AsignacionModuloRead",
    "AsignacionModuloUpdate",
    "ExamenCreate",
    "ExamenRead",
    "ExamenUpdate",
    "FeedbackResultadoCreate",
    "FeedbackResultadoRead",
    "FeedbackResultadoUpdate",
    "IngenieriaCreate",
    "IngenieriaRead",
    "IngenieriaUpdate",
    "IntentoPresentacionCreate",
    "IntentoPresentacionRead",
    "IntentoPresentacionUpdate",
    "ModuloCreate",
    "ModuloRead",
    "ModuloUpdate",
    "NumeroCuentaLogin",
    "PermissionCreate",
    "PermissionRead",
    "PermissionUpdate",
    "PreguntaCreate",
    "PreguntaRead",
    "PreguntaUpdate",
    "RoleCreate",
    "RoleRead",
    "RoleUpdate",
    "Token",
    "UserCreate",
    "UserRead",
    "UserUpdate",
]