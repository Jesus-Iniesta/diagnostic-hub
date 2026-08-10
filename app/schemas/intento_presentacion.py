from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.asignacion_modulo import AsignacionModuloRead
from app.schemas.feedback_resultado import FeedbackResultadoRead


class IntentoPresentacionBase(BaseModel):
    asignacion_id: int
    intento_num: int
    inicio: datetime | None = None
    fin: datetime | None = None
    duracion_minutos: int | None = None
    puntaje_total: Decimal | None = None
    puntaje_algebra: Decimal | None = None
    puntaje_trigonometria: Decimal | None = None
    puntaje_geometria: Decimal | None = None
    puntaje_calculo: Decimal | None = None
    estado: int


class IntentoPresentacionCreate(IntentoPresentacionBase):
    pass


class IntentoPresentacionUpdate(BaseModel):
    asignacion_id: int | None = None
    intento_num: int | None = None
    inicio: datetime | None = None
    fin: datetime | None = None
    duracion_minutos: int | None = None
    puntaje_total: Decimal | None = None
    puntaje_algebra: Decimal | None = None
    puntaje_trigonometria: Decimal | None = None
    puntaje_geometria: Decimal | None = None
    puntaje_calculo: Decimal | None = None
    estado: int | None = None


class IntentoPresentacionRead(IntentoPresentacionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    modulos: list[AsignacionModuloRead] = []
    feedback: FeedbackResultadoRead | None = None