from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base

class IntentoPresentacion(Base):
    __tablename__ = "intento_presentacion"

    __table_args__ = (
        UniqueConstraint(
            "asignacion_id",
            "intento_num",
            name="uq_intento_presentacion_asignacion_num"
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    asignacion_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("asignacion_examen.id"),
        nullable=False,
        index=True
    )

    intento_num: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    inicio: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    fin: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    duracion_minutos: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    puntaje_total: Mapped[Decimal | None] = mapped_column(
        Numeric(6, 2),
        nullable=True
    )

    puntaje_algebra: Mapped[Decimal | None] = mapped_column(
        Numeric(6, 2),
        nullable=True
    )

    puntaje_trigonometria: Mapped[Decimal | None] = mapped_column(
        Numeric(6, 2),
        nullable=True
    )

    puntaje_geometria: Mapped[Decimal | None] = mapped_column(
        Numeric(6, 2),
        nullable=True
    )

    puntaje_calculo: Mapped[Decimal | None] = mapped_column(
        Numeric(6, 2),
        nullable=True
    )

    estado: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    asignacion = relationship(
        "AsignacionExamen",
        back_populates="intentos"
    )

    modulos = relationship(
        "AsignacionModulo",
        back_populates="intento",
        cascade="all, delete-orphan"
    )

    feedback = relationship(
        "FeedbackResultado",
        back_populates="intento",
        uselist=False,
        cascade="all, delete-orphan"
    )