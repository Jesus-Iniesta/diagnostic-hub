from datetime import date

from sqlalchemy import (
    Date,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base

class FeedbackResultado(Base):
    __tablename__ = "feedback_resultado"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    intento_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("intento_presentacion.id"),
        nullable=False,
        unique=True,
        index=True
    )

    feedback_general: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    feedback_algebra: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    feedback_trigonometria: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    feedback_geometria: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    feedback_calculo: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    nivel_desempeno: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    recomendacion: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    pdf_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )

    generado_en: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    intento = relationship(
        "IntentoPresentacion",
        back_populates="feedback"
    )