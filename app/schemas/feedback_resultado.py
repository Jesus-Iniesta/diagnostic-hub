from datetime import date

from pydantic import BaseModel, ConfigDict


class FeedbackResultadoBase(BaseModel):
    intento_id: int
    feedback_general: str | None = None
    feedback_algebra: str | None = None
    feedback_trigonometria: str | None = None
    feedback_geometria: str | None = None
    feedback_calculo: str | None = None
    nivel_desempeno: int | None = None
    recomendacion: str | None = None
    pdf_url: str | None = None
    generado_en: date | None = None


class FeedbackResultadoCreate(FeedbackResultadoBase):
    pass


class FeedbackResultadoUpdate(BaseModel):
    feedback_general: str | None = None
    feedback_algebra: str | None = None
    feedback_trigonometria: str | None = None
    feedback_geometria: str | None = None
    feedback_calculo: str | None = None
    nivel_desempeno: int | None = None
    recomendacion: str | None = None
    pdf_url: str | None = None
    generado_en: date | None = None


class FeedbackResultadoRead(FeedbackResultadoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int